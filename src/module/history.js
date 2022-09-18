/**
 * @fileOverview
 *
 * 历史管理
 *
 * @author: wxs
 * @copyright: 2022-9-18
 */

define(function (require, exports, module) {
  var kity = require("../core/kity");
  var Command = require("../core/command");
  var Module = require("../core/module");

  var jsonDiff = require("../tool/jsondiff");

  function HistoryRuntime() {
    var minder = this;
    var MAX_HISTORY = 100;

    var lastSnap;
    var patchLock;
    var undoDiffs;
    var redoDiffs;

    function reset() {
      undoDiffs = [];
      redoDiffs = [];
      lastSnap = minder.exportJson();
    }

    function makeUndoDiff() {
      var headSnap = minder.exportJson();
      var diff = jsonDiff(headSnap, lastSnap);
      if (diff.length) {
        undoDiffs.push(diff);
        while (undoDiffs.length > MAX_HISTORY) {
          undoDiffs.shift();
        }
        lastSnap = headSnap;
        return true;
      }
    }

    function makeRedoDiff() {
      var revertSnap = minder.exportJson();
      redoDiffs.push(jsonDiff(revertSnap, lastSnap));
      lastSnap = revertSnap;
    }

    function undo() {
      patchLock = true;
      var undoDiff = undoDiffs.pop();
      if (undoDiff) {
        minder.applyPatches(undoDiff);
        makeRedoDiff();
      }
      patchLock = false;
    }

    function redo() {
      patchLock = true;
      var redoDiff = redoDiffs.pop();
      if (redoDiff) {
        minder.applyPatches(redoDiff);
        makeUndoDiff();
      }
      patchLock = false;
    }

    function changed() {
      if (patchLock) return;
      if (makeUndoDiff()) redoDiffs = [];
    }

    function hasUndo() {
      return !!undoDiffs.length;
    }

    function hasRedo() {
      return !!redoDiffs.length;
    }

    function updateSelection(e) {
      if (!patchLock) return;
      var patch = e.patch;
      switch (patch.express) {
        case "node.add":
          minder.select(patch.node.getChild(patch.index), true);
          break;
        case "node.remove":
        case "data.replace":
        case "data.remove":
        case "data.add":
          minder.select(patch.node, true);
          break;
      }
    }

    this.history = {
      reset: reset,
      undo: undo,
      redo: redo,
      hasUndo: hasUndo,
      hasRedo: hasRedo,
    };
    reset();
    minder.on("contentchange", changed);
    minder.on("import", reset);
    minder.on("patch", updateSelection);
  }

  /**
   * @command UndoCommand
   * @description 撤销
   * @state
   *   0: 当前有可撤销的操作
   *  -1: 当前没有可撤销的操作
   * @return 返回历史管理
   */
  var UndoCommand = kity.createClass("UndoCommand", {
    base: Command,

    execute: function (minder, name) {
      minder.history.undo();
    },

    queryValue: function (minder) {
      return minder.history;
    },

    queryState: function (minder) {
      return minder.history.hasUndo ? 0 : -1;
    },
  });

  /**
   * @command RedoCommand
   * @description 重做
   * @state
   *   0: 当前有可撤销的操作
   *  -1: 当前没有可撤销的操作
   * @return 返回历史管理
   */
  var RedoCommand = kity.createClass("RedoCommand", {
    base: Command,

    execute: function (minder) {
      minder.history.redo();
    },
    queryState: function (minder) {
      return minder.history.hasRedo ? 0 : -1;
    },
  });

  Module.register("HistoryModule", {
    init: HistoryRuntime,
    commands: {
      undo: UndoCommand,
      redo: RedoCommand,
    },
    // contextmenu: [
    //   {
    //     command: "resetlayout",
    //   },
    //   {
    //     divider: true,
    //   },
    // ],

    commandShortcutKeys: {
      undo: "Ctrl+Z",
      redo: "Ctrl+Shift+Z",
    },
  });
});
