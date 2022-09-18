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
      return "right";
    },

    getConnect: function (node) {
      return "poly-circle";
      // return "poly";
    },
  });
});
