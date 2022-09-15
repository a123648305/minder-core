/**
 * @fileOverview
 *
 * 往右布局结构模板
 *
 * @author: wxs
 * @copyright:  2022
 */
define(function (require, exports, module) {
  var template = require("../core/template");

  template.register("default", {
    getLayout: function (node) {
      var level = node.getLevel();
      //console.log(node.data, "cc");

      // 根节点
      if (level === 0) {
        return "right";
      }
      // // 一级节点
      // if (level === 1) {
      //   return "right";
      // }
      return "right";
    },

    getConnect: function (node) {
      return "poly-circle";
      // return "poly";
    },
  });
});
