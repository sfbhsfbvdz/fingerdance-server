// components/activity-card/activity-card.js
Component({
  properties: {
    activity: { type: Object, value: {} },
    // 'compact' = 首页小卡片，'full' = 列表页完整卡片
    mode: { type: String, value: 'full' }
  },

  data: {
    progressPercent: 0
  },

  observers: {
    'activity': function(activity) {
      // 计算进度百分比，不放整个对象进 setData
      const { currentParticipants, minParticipants } = activity
      if (!minParticipants) return
      const percent = Math.min(Math.round((currentParticipants / minParticipants) * 100), 100)
      this.setData({ progressPercent: percent })
    }
  },

  methods: {
    onTap() {
      this.triggerEvent('tap', { id: this.properties.activity.id })
    }
  }
})
