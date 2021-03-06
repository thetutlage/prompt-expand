'use strict';

var Prompt = require('prompt-rawlist');
var colors = require('ansi-colors');

/**
 * Create
 */

function Expand(/*question, answers, ui*/) {
  Prompt.apply(this, arguments);
  var prompt = this;

  this.options.footer = '';
  this.choices.options.pointer = ' ';
  this.errorMessage = colors.red('>>') + ' Please enter a valid letter';

  this.choices.addChoice({
    name: 'Help',
    long: 'Help, list all options'
  });

  this.initialDefault = this.question.default;
  this.question.default = null;
  this.firstSubmit = true;

  var keys = shortcuts(this.choices, this.initialDefault);

  this.keys = keys;
  this.charmap = keys.charmap;
  this.keymap = keys.keymap;

  this.action('up', identity);
  this.action('down', identity);
  this.action('number', identity);

  if (typeof this.options.validate !== 'function') {
    this.options.validate = function(val) {
      if (this.status !== 'submitted') {
        return true;
      }
      return val != null;
    };
  }

  this.off('render');
  this.on('render', function(context) {
    var line = this.rl.line.trim();
    if (!line || this.status === 'help') return;
    var choice = this.getChoice(line, 'key');
    if (choice) {
      this.initialDefault = null;
      context.message += colors.cyan('\n>> ') + choice.name;
    } else {
      this.status = 'pending';
    }
  });

  this.choices.options.format = function(line) {
    var choice = prompt.getChoice(line, 'value');
    line = choice.shortcut + ') ' + choice.name;
    return this.position === this.index ? colors.cyan(line) : line;
  };
}

/**
 * Inherit `RawList` prompt
 */

Prompt.extend(Expand);

Expand.prototype.getChoice = function(line, prop) {
  var choices = this.choices.where(function(choice) {
    return choice[prop] === line;
  });

  if (choices && choices.length) {
    return choices[0];
  }
};

Expand.prototype.renderHelp = function(line, prop) {
  return colors.dim(' (' + this.keys.hint + ') ');
};

/**
 * Render all prompt choices to the terminal
 */

Expand.prototype.renderOutput = function() {
  var line = this.rl.line.trim().toLowerCase();
  if (this.status === 'help') {
    this.rl.line = line.slice(-1);
  }

  var key = this.charmap[line];
  if (key) {
    this.position = this.choices.getIndex(key);
  } else {
    this.position = -1;
  }

  if (line === 'h') {
    this.status = 'help';
    this.rl.line = '';
  }

  switch (this.status) {
    case 'help':
      this.initialDefault = null;

      var msg = '';
      msg += this.choices.render(this.position, this.question.options);
      msg += '\n  Answer: ' + this.rl.line;
      if (this.position === -1 && this.rl.line.trim() !== '') {
        msg += colors.red(' (invalid)');
      }
      this.rl.line = '';
      return msg;
    case 'pending':
    case 'interacted':
    case 'initialized':
    case 'answered':
    default: {
      return line;
    }
  }
};

/**
 * Get the selected answer
 * @param {String} `input`
 * @param {Object} `key`
 */

Expand.prototype.getAnswer = function(input, key) {
  var val = key && key.name === 'line' && input.trim();
  var def = this.initialDefault;
  this.initialDefault = null;
  if (!val) {
    val = def;
  }

  if (val) {
    var name = this.charmap[val];
    if (name != null) {
      return (this.answer = this.choices.get(name, 'value'));
    }
  }
};

Expand.prototype.renderAnswer = function() {
  return this.answer ? colors.cyan(this.answer.name) : null;
};

function identity(pos) {
  return pos;
}

function shortcuts(choices, def) {
  var items = choices.items;
  var keymap = {};
  var charmap = {};
  var hint = '';

  for (var i = 0; i < items.length; i++) {
    var choice = items[i];
    var idx = 0;
    var key = choice.key;
    var ch = key[idx].toLowerCase();
    while (charmap[ch]) {
      ch = key[++idx].toLowerCase();
    }
    if (def && def.toLowerCase() === key.toLowerCase()) {
      hint += ch.toUpperCase();
    } else {
      hint += ch;
    }
    choice.shortcut = ch;
    charmap[ch] = key;
    keymap[key] = ch;
  }

  return {
    hint: hint,
    charmap: charmap,
    keymap: keymap
  };
}

/**
 * Expose `Expand` prompt
 */

module.exports = Expand;
