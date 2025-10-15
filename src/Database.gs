
/**
 * CDN 地址（生产环境）
 */
const SENDER_DB_URL = 'https://cdn.jsdelivr.net/gh/msylctt/chrono-lite@latest/data/verified.json';

/**
 * 缓存配置常量
 */
const CACHE_META_KEY = 'sender_db_meta';
const CACHE_SHARD_PREFIX = 'sender_db_shard_';
const CACHE_DURATION = 6 * 60 * 60; // 6 小时（秒）
const NUM_SHARDS = 50;               // 默认分片数（约每片 ~100 条）

/**
 * 从 CDN 加载数据库
 */
function loadSenderDatabaseFromCDN() {
  Logger.log('📥 从 CDN 加载数据库...');
  var startTime = new Date();

  try {
    var response = UrlFetchApp.fetch(SENDER_DB_URL, {
      muteHttpExceptions: true,
      validateHttpsCertificates: true
    });

    if (response.getResponseCode() !== 200) {
      throw new Error('CDN 返回错误: ' + response.getResponseCode());
    }

    var data = JSON.parse(response.getContentText());
    var endTime = new Date();
    var duration = endTime - startTime;

    var count = 0;
    if (data && data.senders) {
      try {
        count = Object.keys(data.senders).length;
      } catch (e) {
        count = 0;
      }
    }

    Logger.log('✅ CDN 数据库加载成功');
    Logger.log('  - 版本: ' + (data.version || '未知'));
    Logger.log('  - 条目数: ' + count);
    Logger.log('  - 耗时: ' + duration + 'ms');

    // 标准化结构：确保包含 total_entries
    if (!data.total_entries && data.senders) {
      data.total_entries = count;
    }

    return data;

  } catch (error) {
    Logger.log('❌ CDN 加载失败: ' + error.message);
    return null;
  }
}

/**
 * 主入口：加载发件人数据库
 */
function loadSenderDatabase() {
  return loadSenderDatabaseFromCDN();
}

/**
 * 哈希函数：邮箱 → 分片 ID
 */
function hashToShard(email, numShards) {
  var hash = 0;
  for (var i = 0; i < email.length; i++) {
    var char = email.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 32 位
  }
  return Math.abs(hash) % numShards;
}

/**
 * 根据数据规模选择分片数
 * 按每片~100条计算，最多 NUM_SHARDS
 */
function chooseShardCount(db) {
  var total = db && db.total_entries ? db.total_entries : (db && db.senders ? Object.keys(db.senders).length : 0);
  if (total === 0) return NUM_SHARDS;

  var shardsBySize = Math.ceil(total / 100);
  return Math.min(NUM_SHARDS, shardsBySize);
}

/**
 * 将数据库分片
 */
function shardDatabase(senders, numShards) {
  var shards = {};
  // 初始化分片
  for (var i = 0; i < numShards; i++) {
    shards[i] = {};
  }
  // 分配记录到分片（统一使用小写邮箱键）
  var emails = Object.keys(senders);
  for (var j = 0; j < emails.length; j++) {
    var email = (emails[j] || '').toLowerCase();
    var shardId = hashToShard(email, numShards);
    shards[shardId][email] = senders[emails[j]];
  }
  return shards;
}

/**
 * 将分片存储到缓存
 */
function storeShardedDatabase() {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10 * 1000); // 最长等待 10s
  } catch (e) {
    Logger.log('⚠️ 获取锁失败，可能有并发刷新正在进行: ' + e.message);
  }

  Logger.log('💾 开始分片存储');
  var startTime = new Date();
  var cache = CacheService.getScriptCache();

  // 1) 加载数据库
  var db = loadSenderDatabase();
  if (!db || !db.senders) {
    Logger.log('❌ 无法加载数据库');
    try { lock.releaseLock(); } catch (e2) { /* ignore */ }
    return null;
  }

  var senders = db.senders;
  var shardCount = chooseShardCount(db);

  // 2) 分片
  Logger.log('🔨 分片数据...');
  var shards = shardDatabase(senders, shardCount);

  // 3) 存储每个分片
  Logger.log('💾 存储分片到缓存...');
  var shardIds = Object.keys(shards);
  for (var i = 0; i < shardIds.length; i++) {
    var shardId = shardIds[i];
    var key = CACHE_SHARD_PREFIX + shardId;
    var value = JSON.stringify(shards[shardId]);
    var sizeKB = (value.length / 1024).toFixed(2);
    Logger.log('  - Shard ' + shardId + ': ' + Object.keys(shards[shardId]).length + ' 条, ' + sizeKB + ' KB');
    cache.put(key, value, CACHE_DURATION);
  }

  // 4) 存储元数据
  var metadata = {
    version: db.version || 'unknown',
    shardCount: shardIds.length,
    totalEntries: db.total_entries || Object.keys(senders).length,
    lastUpdated: new Date().toISOString()
  };
  cache.put(CACHE_META_KEY, JSON.stringify(metadata), CACHE_DURATION);

  var duration = new Date() - startTime;
  Logger.log('✅ 分片存储完成');
  Logger.log('  - 分片数: ' + shardIds.length);
  Logger.log('  - 总条目: ' + metadata.totalEntries);
  Logger.log('  - 耗时: ' + duration + 'ms');

  try { lock.releaseLock(); } catch (e2) { /* ignore */ }
  return metadata;
}

/**
 * 读取并解析元数据
 */
function getCacheMeta() {
  var cache = CacheService.getScriptCache();
  var metaStr = cache.get(CACHE_META_KEY);
  return metaStr ? JSON.parse(metaStr) : null;
}

/**
 * 确保缓存已初始化（如未初始化则构建）
 */
function ensureCacheInitialized() {
  var meta = getCacheMeta();
  if (!meta) {
    Logger.log('ℹ️ 检测到缓存未初始化，正在构建...');
    meta = storeShardedDatabase(); // 默认走 CDN，失败会回退测试
  }
  return meta;
}

/**
 * 查询单个发件人（O(1) 复杂度）
 */
function querySender(email) {
  if (!email) return null;
  var normalized = (email + '').toLowerCase();

  // 1) 确保缓存准备就绪
  var meta = ensureCacheInitialized();
  if (!meta || !meta.shardCount) {
    Logger.log('⚠️ 无法获得有效元数据');
    return null;
  }

  // 2) 计算分片 ID
  var shardId = hashToShard(normalized, meta.shardCount);

  // 3) 读取分片
  var cache = CacheService.getScriptCache();
  var shardKey = CACHE_SHARD_PREFIX + shardId;
  var shardStr = cache.get(shardKey);

  // 若分片丢失，尝试重建一次
  if (!shardStr) {
    Logger.log('⚠️ 分片缓存缺失: ' + shardKey + '，尝试重建缓存...');
    storeShardedDatabase();
    shardStr = cache.get(shardKey);
    if (!shardStr) {
      Logger.log('❌ 仍无法读取分片: ' + shardKey);
      return null;
    }
  }

  // 4) 查询
  var shard = JSON.parse(shardStr || '{}');
  return shard[normalized] || null;
}

/**
 * 批量查询（按分片分组，减少缓存读取）
 */
function queryBatch(emails) {
  if (!emails || !emails.length) return {};
  var results = {};
  var cache = CacheService.getScriptCache();

  // 1) 确保缓存准备就绪
  var meta = ensureCacheInitialized();
  if (!meta || !meta.shardCount) return {};

  // 2) 规范化邮箱并按分片分组
  var shardGroups = {};
  for (var i = 0; i < emails.length; i++) {
    var e = (emails[i] + '').toLowerCase();
    var shardId = hashToShard(e, meta.shardCount);
    if (!shardGroups[shardId]) shardGroups[shardId] = [];
    shardGroups[shardId].push(e);
  }

  // 3) 批量读取涉及的分片
  var shardIds = Object.keys(shardGroups);
  var shardKeys = [];
  for (var j = 0; j < shardIds.length; j++) {
    shardKeys.push(CACHE_SHARD_PREFIX + shardIds[j]);
  }
  var shardDataMap = cache.getAll(shardKeys);

  // 如果有缺失分片，尝试整体重建一次
  var missing = false;
  for (var k = 0; k < shardKeys.length; k++) {
    if (!shardDataMap[shardKeys[k]]) { missing = true; break; }
  }
  if (missing) {
    Logger.log('⚠️ 检测到缺失分片，尝试重建缓存...');
    storeShardedDatabase();
    shardDataMap = cache.getAll(shardKeys);
  }

  // 4) 查询结果
  for (var s = 0; s < shardIds.length; s++) {
    var sid = shardIds[s];
    var sKey = CACHE_SHARD_PREFIX + sid;
    var shardObj = {};
    try {
      shardObj = JSON.parse(shardDataMap[sKey] || '{}');
    } catch (e2) {
      shardObj = {};
    }
    var list = shardGroups[sid];
    for (var t = 0; t < list.length; t++) {
      var em = list[t];
      results[em] = shardObj[em] || null;
    }
  }

  return results;
}

/**
 * 清空缓存（手动调试用）
 */
function clearSenderCache() {
  Logger.log('🧹 清空缓存...');
  var cache = CacheService.getScriptCache();
  var meta = getCacheMeta();
  if (meta && meta.shardCount) {
    for (var i = 0; i < meta.shardCount; i++) {
      cache.remove(CACHE_SHARD_PREFIX + i);
    }
  }
  cache.remove(CACHE_META_KEY);
  Logger.log('✅ 缓存已清空');
}

/**
 * ------------- 测试与验证 -------------
 */

/**
 * 测试: CDN 加载
 */
function testCDNLoading() {
  var db = loadSenderDatabaseFromCDN();
  if (db && db.senders) {
    Logger.log('✅ CDN 加载成功');
    Logger.log('数据库版本: ' + (db.version || 'unknown'));
    Logger.log('条目数: ' + Object.keys(db.senders).length);
  } else {
    Logger.log('❌ CDN 加载失败');
  }
}

/**
 * 测试: 分片存储
 */
function testShardedStorage() {
  var meta = storeShardedDatabase();
  if (meta) {
    Logger.log('✅ 分片存储成功');
    Logger.log('元数据: ' + JSON.stringify(meta));
  } else {
    Logger.log('❌ 分片存储失败');
  }
}

/**
 * 测试: 单个查询
 */
function testSingleQuery() {
  Logger.log('🔍 测试单个查询');

  // 确保数据已缓存
  ensureCacheInitialized();

  var testEmails = [
    'newsletter@google.com',
    'updates@apple.com',
    'nonexistent@example.com'
  ];

  for (var i = 0; i < testEmails.length; i++) {
    var email = testEmails[i];
    var startTime = new Date();
    var result = querySender(email);
    var duration = new Date() - startTime;

    if (result) {
      Logger.log('✅ 找到: ' + email);
      Logger.log('  - 分类: ' + result.category);
      Logger.log('  - 耗时: ' + duration + 'ms');
    } else {
      Logger.log('❌ 未找到: ' + email + ' (耗时: ' + duration + 'ms)');
    }
  }
}

/**
 * 测试: 批量查询性能
 */
function testBatchQuery() {
  Logger.log('🔍 测试批量查询');

  // 确保数据已缓存
  ensureCacheInitialized();

  var testEmails = [
    'newsletter@google.com',
    'updates@apple.com',
    'promo@amazon.com',
    'newsletter@microsoft.com',
    'updates@notion.so'
  ];

  Logger.log('查询数量: ' + testEmails.length);

  // 方法 1：逐个查询
  Logger.log('\n方法 1: 逐个查询');
  var start1 = new Date();
  var results1 = {};
  for (var i = 0; i < testEmails.length; i++) {
    results1[testEmails[i]] = querySender(testEmails[i]);
  }
  var duration1 = new Date() - start1;
  Logger.log('耗时: ' + duration1 + 'ms');

  // 方法 2：批量查询
  Logger.log('\n方法 2: 批量查询');
  var start2 = new Date();
  var results2 = queryBatch(testEmails);
  var duration2 = new Date() - start2;
  Logger.log('耗时: ' + duration2 + 'ms');

  // 对比
  Logger.log('\n📊 性能对比');
  Logger.log('逐个查询: ' + duration1 + 'ms');
  Logger.log('批量查询: ' + duration2 + 'ms');
  if (duration1 > 0) {
    var improvement = ((1 - duration2 / duration1) * 100).toFixed(1);
    Logger.log('提升: ' + improvement + '%');
  }

  // 结果一致性
  var match = true;
  for (var k = 0; k < testEmails.length; k++) {
    var e = testEmails[k];
    if (JSON.stringify(results1[e]) !== JSON.stringify(results2[e])) {
      match = false;
      break;
    }
  }
  Logger.log('结果一致性: ' + (match ? '✅ 通过' : '❌ 失败'));
}

/**
 * Phase 1 完整验证
 */
function runPhase1Tests() {
  Logger.log('🚀 开始 Phase 1 验证');
  Logger.log(new Array(61).join('='));

  var results = {
    phase: 'Phase 1',
    tests: [],
    performance: {},
    allPassed: true
  };

  // 测试 1: CDN 加载
  try {
    Logger.log('\n📥 测试 1: CDN 加载');
    var cdnStart = new Date();
    var db = loadSenderDatabaseFromCDN();
    var cdnDuration = new Date() - cdnStart;
    results.performance.cdnLoad = cdnDuration;
    var pass1 = db && db.senders && Object.keys(db.senders).length > 0;
    results.tests.push({ name: 'CDN Loading', passed: pass1 });
    Logger.log((pass1 ? '✅ 通过' : '❌ 失败') + ' (耗时: ' + cdnDuration + 'ms)');
    if (!pass1) results.allPassed = false;
  } catch (e) {
    results.tests.push({ name: 'CDN Loading', passed: false, error: e.message });
    results.allPassed = false;
  }

  // 测试 2: 分片存储
  try {
    Logger.log('\n💾 测试 2: 分片存储');
    var storageStart = new Date();
    var meta = storeShardedDatabase();
    var storageDuration = new Date() - storageStart;
    results.performance.storage = storageDuration;
    var pass2 = meta && meta.shardCount > 0;
    results.tests.push({ name: 'Sharded Storage', passed: pass2 });
    Logger.log((pass2 ? '✅ 通过' : '❌ 失败') + ' (耗时: ' + storageDuration + 'ms)');
    if (!pass2) results.allPassed = false;
  } catch (e2) {
    results.tests.push({ name: 'Sharded Storage', passed: false, error: e2.message });
    results.allPassed = false;
  }

  // 测试 3: 单个查询
  try {
    Logger.log('\n🔍 测试 3: 单个查询');
    var queryStart = new Date();
    var result = querySender('newsletter@google.com');
    var queryDuration = new Date() - queryStart;
    results.performance.singleQuery = queryDuration;
    var pass3 = result && result.category && queryDuration < 50;
    results.tests.push({ name: 'Single Query', passed: pass3 });
    Logger.log((pass3 ? '✅ 通过' : '❌ 失败') + ' (耗时: ' + queryDuration + 'ms)');
    if (!pass3) results.allPassed = false;
  } catch (e3) {
    results.tests.push({ name: 'Single Query', passed: false, error: e3.message });
    results.allPassed = false;
  }

  // 测试 4: 批量查询
  try {
    Logger.log('\n📦 测试 4: 批量查询');
    var testEmails = ['newsletter@google.com', 'updates@apple.com', 'promo@amazon.com'];
    var batchStart = new Date();
    var batchResults = queryBatch(testEmails);
    var batchDuration = new Date() - batchStart;
    results.performance.batchQuery = batchDuration;

    var foundCount = 0;
    var keys = Object.keys(batchResults);
    for (var i = 0; i < keys.length; i++) {
      if (batchResults[keys[i]] !== null) foundCount++;
    }
    var pass4 = foundCount >= testEmails.length - 1 && batchDuration < 100;
    results.tests.push({ name: 'Batch Query', passed: pass4 });
    Logger.log((pass4 ? '✅ 通过' : '❌ 失败') + ' (找到: ' + foundCount + '/' + testEmails.length + ', 耗时: ' + batchDuration + 'ms)');
    if (!pass4) results.allPassed = false;
  } catch (e4) {
    results.tests.push({ name: 'Batch Query', passed: false, error: e4.message });
    results.allPassed = false;
  }

  Logger.log('\n' + new Array(61).join('='));
  Logger.log('🏁 Phase 1 验证完成');
  Logger.log('总测试数: ' + results.tests.length);

  var passCount = 0;
  for (var p = 0; p < results.tests.length; p++) {
    if (results.tests[p].passed) passCount++;
  }
  Logger.log('通过数: ' + passCount);
  Logger.log('状态: ' + (results.allPassed ? '✅ 全部通过' : '❌ 存在失败'));

  Logger.log('\n📊 性能汇总:');
  Logger.log('  - CDN 加载: ' + (results.performance.cdnLoad || '-') + 'ms');
  Logger.log('  - 分片存储: ' + (results.performance.storage || '-') + 'ms');
  Logger.log('  - 单个查询: ' + (results.performance.singleQuery || '-') + 'ms');
  Logger.log('  - 批量查询: ' + (results.performance.batchQuery || '-') + 'ms');

  return results;
}

/**
 * 数据库连接测试（用于 Code.gs 调用）
 */
function testDatabaseConnection() {
  Logger.log('🔎 测试数据库连接...');

  var db = loadSenderDatabase();
  if (!db || !db.senders) {
    Logger.log('❌ 数据库加载失败');
    return;
  }

  var total = Object.keys(db.senders).length;
  Logger.log('✅ 加载完成: version=' + (db.version || 'unknown') + ', entries=' + total);

  Logger.log('🧪 构建缓存（分片）...');
  var meta = storeShardedDatabase();
  if (!meta) {
    Logger.log('❌ 缓存构建失败');
    return;
  }

  Logger.log('✅ 缓存就绪: ' + JSON.stringify(meta));

  var sample = 'newsletter@google.com';
  var r = querySender(sample);
  Logger.log('🔎 示例查询: ' + sample + ' → ' + (r ? r.category : 'NOT FOUND'));
}