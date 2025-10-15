/**
 * Chrono Lite - 统一日志系统
 *
 * 日志格式: [LEVEL] [MODULE] Message | key=value
 *
 * 日志级别:
 * - ERROR: 错误，需要立即关注
 * - WARN:  警告，可能有问题
 * - INFO:  重要信息流程
 * - DEBUG: 调试详情
 *
 * @author ultrathink
 * @version 1.0.0
 */

var Log = (function() {
  'use strict';

  // 日志级别
  var Level = {
    ERROR: 'ERROR',
    WARN: 'WARN',
    INFO: 'INFO',
    DEBUG: 'DEBUG'
  };

  // 模块名称
  var Module = {
    INIT: 'INIT',
    DATABASE: 'DATABASE',
    CLASSIFIER: 'CLASSIFIER',
    ACTION: 'ACTION',
    TRIGGER: 'TRIGGER',
    DEBUG_MODE: 'DEBUG',
    UI: 'UI',
    SYNC: 'SYNC'
  };

  /**
   * 格式化日志消息
   * @param {string} level - 日志级别
   * @param {string} module - 模块名
   * @param {string} message - 消息
   * @param {Object} meta - 元数据（可选）
   */
  function formatLog(level, module, message, meta) {
    var parts = ['[' + level + ']', '[' + module + ']', message];

    if (meta && Object.keys(meta).length > 0) {
      var metaParts = [];
      for (var key in meta) {
        if (meta.hasOwnProperty(key)) {
          var value = meta[key];
          // 格式化值
          if (typeof value === 'object') {
            value = JSON.stringify(value);
          }
          metaParts.push(key + '=' + value);
        }
      }
      parts.push('|');
      parts.push(metaParts.join(' '));
    }

    return parts.join(' ');
  }

  /**
   * 记录日志
   */
  function log(level, module, message, meta) {
    var logMessage = formatLog(level, module, message, meta);
    Logger.log(logMessage);
  }

  // 公共接口
  return {
    // 级别常量
    Level: Level,
    Module: Module,

    // 便捷方法
    error: function(module, message, meta) {
      log(Level.ERROR, module, message, meta);
    },

    warn: function(module, message, meta) {
      log(Level.WARN, module, message, meta);
    },

    info: function(module, message, meta) {
      log(Level.INFO, module, message, meta);
    },

    debug: function(module, message, meta) {
      log(Level.DEBUG, module, message, meta);
    },

    // 性能计时器
    timer: function(label) {
      var startTime = new Date().getTime();
      return {
        end: function(module, meta) {
          var duration = new Date().getTime() - startTime;
          var logMeta = meta || {};
          logMeta.duration_ms = duration;
          log(Level.INFO, module, label + ' completed', logMeta);
          return duration;
        }
      };
    },

    // 操作日志（带开始和结束）
    operation: function(module, operationName) {
      var startTime = new Date().getTime();
      log(Level.INFO, module, operationName + ' started', {});

      return {
        success: function(meta) {
          var duration = new Date().getTime() - startTime;
          var logMeta = meta || {};
          logMeta.duration_ms = duration;
          logMeta.status = 'success';
          log(Level.INFO, module, operationName + ' completed', logMeta);
        },
        fail: function(error, meta) {
          var duration = new Date().getTime() - startTime;
          var logMeta = meta || {};
          logMeta.duration_ms = duration;
          logMeta.status = 'failed';
          logMeta.error = error.message || error;
          log(Level.ERROR, module, operationName + ' failed', logMeta);
        }
      };
    }
  };
})();
