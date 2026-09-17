/* 星语 · 常量 */
(function (w) {
  'use strict';

  var MOODS = [
    { key: 'happy',   emoji: '😆', label: '开心' },
    { key: 'calm',    emoji: '😌', label: '平静' },
    { key: 'sad',     emoji: '😢', label: '难过' },
    { key: 'angry',   emoji: '😠', label: '愤怒' },
    { key: 'anxious', emoji: '😰', label: '焦虑' },
    { key: 'annoyed', emoji: '😒', label: '烦躁' },
    { key: 'tired',   emoji: '🥱', label: '疲惫' }
  ];

  var TAGS = [
    { key: 'daily',       label: '日常' },
    { key: 'happy_event', label: '开心事' },
    { key: 'complaint',   label: '吐槽' },
    { key: 'trouble',     label: '烦恼' },
    { key: 'reflection',  label: '感悟' }
  ];

  function moodOf(key) {
    for (var i = 0; i < MOODS.length; i++) if (MOODS[i].key === key) return MOODS[i];
    return MOODS[1];
  }
  function tagOf(key) {
    for (var i = 0; i < TAGS.length; i++) if (TAGS[i].key === key) return TAGS[i];
    return TAGS[0];
  }

  function genUserId() {
    var id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx';
    return id.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }

  w.TreeHoleData = {
    MOODS: MOODS, TAGS: TAGS,
    MOOD_OF: moodOf, TAG_OF: tagOf,
    genUserId: genUserId,
    MAX_IMAGES: 3, MAX_VOICE_SEC: 180, MAX_TEXT: 5000
  };
})(window);
