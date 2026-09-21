/* =========================================================================
   UI STRINGS
   =========================================================================

   TRANSLATION PRINCIPLE

   These are not mechanical mirrors of each other. Each language is written
   the way that language actually greets a stranger.

   English church copy tends toward the direct and personal:
     "Plan your visit" / "We'd love to meet you"

   Chinese church copy tends toward the hospitable and slightly more formal,
   and uses 弟兄姊妹 / 新朋友 rather than a literal calque of "visitor":
     「初次来访」/「期待与你相见」

   So "Plan your visit" is NOT 「计划你的访问」 (which reads like a hotel
   booking). It is 「初次来访」 — "coming for the first time".

   Simplified Chinese throughout, per the congregation's mainland-majority
   background and the existing site's usage.
   ========================================================================= */

import type { Locale } from './config';

export const ui = {
  /* ---------------------------------------------------------- identity -- */
  'site.name': { en: 'Waco Chinese Church', zh: '韦科华人教会' },
  'site.nameOther': { en: '韦科华人教会', zh: 'Waco Chinese Church' },
  'site.tagline': {
    en: 'A home for people far from home.',
    zh: '给远方游子的一个家。',
  },
  'site.description': {
    en: 'A Chinese church in Waco, Texas. Worship is in Mandarin, with English interpretation on request. Students, families, professionals and neighbors together since 1993. Everyone is welcome.',
    zh: '德州韦科的一间华人教会。主日以国语（普通话）敬拜，可应需要提供英文翻译。自 1993 年起，学生、家庭、职场人士与本地邻舍在此一同聚集。欢迎每一位朋友。',
  },

  /* ---------------------------------------------------------- navigation */
  'nav.home': { en: 'Home', zh: '首页' },
  'nav.visit': { en: 'Visit', zh: '初次来访' },
  'nav.about': { en: 'About', zh: '关于我们' },
  'nav.community': { en: 'Community', zh: '团契与服事' },
  'nav.students': { en: 'Students', zh: '学生事工' },
  'nav.life': { en: 'Church Life', zh: '教会生活' },
  'nav.sermons': { en: 'Sermons', zh: '讲道' },
  'nav.give': { en: 'Give', zh: '奉献' },
  'nav.contact': { en: 'Contact', zh: '联系我们' },
  'nav.menu': { en: 'Menu', zh: '菜单' },
  'nav.close': { en: 'Close', zh: '关闭' },
  'nav.openMenu': { en: 'Open navigation menu', zh: '打开导航菜单' },
  'nav.closeMenu': { en: 'Close navigation menu', zh: '关闭导航菜单' },
  'nav.primary': { en: 'Primary navigation', zh: '主导航' },
  'nav.footer': { en: 'Footer navigation', zh: '页脚导航' },
  'nav.skip': { en: 'Skip to main content', zh: '跳至主要内容' },

  /* ------------------------------------------------------------ language */
  'lang.switch': { en: 'Language', zh: '语言' },
  'lang.toZh': { en: '切换到中文', zh: '中文' },
  'lang.toEn': { en: 'English', zh: 'Switch to English' },
  'lang.ariaSwitch': {
    en: 'Switch language — this page in Chinese',
    zh: '切换语言 — 本页的英文版本',
  },

  /* --------------------------------------------------------- core facts */
  'facts.sunday': { en: 'Sunday Worship', zh: '主日崇拜' },
  'facts.friday': { en: 'Friday Bible Study', zh: '周五查经' },
  'facts.address': { en: 'Address', zh: '地址' },
  'facts.languages': { en: 'Languages', zh: '语言' },
  'facts.when': { en: 'When', zh: '时间' },
  'facts.where': { en: 'Where', zh: '地点' },
  'facts.who': { en: 'Who it is for', zh: '适合谁' },
  'facts.directions': { en: 'Get directions', zh: '查看路线' },
  'facts.openInMaps': { en: 'Open in Google Maps', zh: '在 Google 地图中打开' },

  /* -------------------------------------------------------------- CTAs -- */
  'cta.plan': { en: 'Plan your visit', zh: '初次来访指南' },
  'cta.planShort': { en: 'Visit us', zh: '来访' },
  'cta.learnMore': { en: 'Learn more', zh: '了解更多' },
  'cta.readMore': { en: 'Read more', zh: '阅读全文' },
  'cta.seeAll': { en: 'See all', zh: '查看全部' },
  'cta.contact': { en: 'Get in touch', zh: '与我们联系' },
  'cta.watch': { en: 'Watch', zh: '观看' },
  'cta.listen': { en: 'Listen', zh: '收听' },
  'cta.give': { en: 'Give', zh: '奉献' },
  'cta.back': { en: 'Back', zh: '返回' },
  'cta.email': { en: 'Email us', zh: '写信给我们' },
  'cta.ride': { en: 'Ask about getting there', zh: '询问交通' },

  /* ------------------------------------------------------------- visit -- */
  'visit.title': { en: 'Planning your first visit', zh: '第一次来，该知道什么' },
  'visit.lede': {
    en: "Walking into a church for the first time takes courage — especially in a new country. Here is exactly what will happen, so nothing is a surprise.",
    zh: '第一次走进教会需要一点勇气 —— 尤其是在异乡。以下是你会经历的每一步，好让你心里有底。',
  },
  'visit.sundayFlow': { en: 'What Sunday looks like', zh: '主日的流程' },
  'visit.faq': { en: 'Common questions', zh: '常见问题' },
  'visit.arriving': { en: 'Arriving', zh: '抵达' },
  'visit.tellUs': { en: "Tell us you're coming", zh: '告诉我们你要来' },
  'visit.tellUsBody': {
    en: "You never have to — you are welcome to simply show up and slip into a back row. But if you let us know, we can arrange for someone to look out for you at the door.",
    zh: '这不是必须的 —— 你完全可以直接来，安静地坐在后排。但若你先告诉我们一声，我们可以安排人在门口留意你。',
  },

  /* ------------------------------------------------------------ about --- */
  'about.story': { en: 'Our story', zh: '我们的故事' },
  'about.beliefs': { en: 'What we believe', zh: '我们的信仰' },
  'about.leadership': { en: 'Our leaders', zh: '教会同工' },
  'about.timeline': { en: 'How we got here', zh: '一路走来' },

  /* -------------------------------------------------------- community --- */
  'community.title': { en: 'Find your people', zh: '找到你的同路人' },
  'community.fellowships': { en: 'Fellowships', zh: '团契' },
  'community.fellowshipsLede': {
    en: 'Sunday is the whole church together. Fellowships are where you are actually known.',
    zh: '主日是全教会聚在一起；而团契，是真正有人认识你的地方。',
  },
  'community.serving': { en: 'Serving together', zh: '一同服事' },
  'community.servingLede': {
    en: 'Nothing here runs on staff. It runs on people who decided to show up.',
    zh: '这里的一切都不是靠专职人员维持的，而是靠一群愿意摆上的人。',
  },
  'community.meets': { en: 'Meets', zh: '聚会时间' },
  'community.forWho': { en: 'For', zh: '对象' },
  'community.language': { en: 'Language', zh: '使用语言' },
  'community.contactLeader': { en: 'Contact', zh: '联系' },

  /* ------------------------------------------------------------- life --- */
  'life.title': { en: 'Church life', zh: '教会生活' },
  'life.upcoming': { en: "What's coming up", zh: '近期活动' },
  'life.noUpcoming': {
    en: 'Nothing on the calendar right now. Sunday worship and Friday Bible study continue as usual.',
    zh: '目前日历上暂无特别活动。主日崇拜与周五查经照常进行。',
  },
  'life.past': { en: 'Looking back', zh: '回顾' },
  'life.moments': { en: 'Moments', zh: '生活剪影' },
  'life.thisWeek': { en: 'This week', zh: '本周' },
  'life.allEvents': { en: 'All events', zh: '所有活动' },
  'life.archive': { en: 'Past events', zh: '往期活动' },
  'life.happened': { en: 'This event has passed', zh: '此活动已结束' },
  'life.today': { en: 'Today', zh: '今天' },
  'life.tomorrow': { en: 'Tomorrow', zh: '明天' },
  'life.thisSunday': { en: 'This Sunday', zh: '本周日' },

  /* ---------------------------------------------------------- sermons --- */
  'sermons.title': { en: 'Sermons', zh: '讲道' },
  'sermons.speaker': { en: 'Speaker', zh: '讲员' },
  'sermons.passage': { en: 'Passage', zh: '经文' },
  'sermons.series': { en: 'Series', zh: '系列' },
  'sermons.date': { en: 'Date', zh: '日期' },
  'sermons.latest': { en: 'Most recent', zh: '最新一篇' },
  'sermons.watchOnYouTube': { en: 'Watch on YouTube', zh: '在 YouTube 上观看' },
  'sermons.allOnYouTube': {
    en: 'All sermons on YouTube',
    zh: '前往 YouTube 频道',
  },
  'sermons.none': {
    en: 'Recordings are kept on the church’s YouTube channel.',
    zh: '录像保存在教会的 YouTube 频道。',
  },

  /* ------------------------------------------------------------- give --- */
  'give.title': { en: 'Giving', zh: '奉献' },
  'give.methods': { en: 'Ways to give', zh: '奉献方式' },
  'give.questions': { en: 'Questions about giving', zh: '关于奉献的疑问' },
  'give.noPressure': {
    en: 'If you are visiting, please do not feel any obligation to give. This page is here for members who have asked how.',
    zh: '若你是初次来访的朋友，请不要有任何负担。这一页是为询问奉献方式的弟兄姊妹预备的。',
  },

  /* ---------------------------------------------------------- contact --- */
  'contact.title': { en: 'Contact', zh: '联系我们' },
  'contact.lede': {
    en: 'A real person reads these. Write in English or Chinese — whichever is easier.',
    zh: '这些留言由真人查看。中文或英文皆可，用你顺手的那一种就好。',
  },
  'contact.name': { en: 'Your name', zh: '你的称呼' },
  'contact.email': { en: 'Email', zh: '电子邮箱' },
  'contact.message': { en: 'Message', zh: '留言' },
  'contact.send': { en: 'Send', zh: '发送' },
  'contact.topic': { en: 'What is this about?', zh: '想聊什么？' },
  'contact.topicVisit': { en: "I'd like to visit", zh: '我想来参加聚会' },
  'contact.topicRide': { en: 'Getting there', zh: '交通与路线' },
  'contact.topicPrayer': { en: 'A prayer request', zh: '代祷需要' },
  'contact.topicOther': { en: 'Something else', zh: '其他' },
  'contact.follow': { en: 'Follow along', zh: '关注我们' },
  'contact.required': { en: 'required', zh: '必填' },
  'contact.sentTitle': { en: 'Thank you — your message is on its way.', zh: '谢谢你，信息已经发送。' },
  'contact.sentBody': {
    en: 'A real person reads these. You should hear back before long.',
    zh: '这些留言由真人查看，我们会尽快回复你。',
  },

  /* ---------------------------------------------------------- meta/sys -- */
  'meta.updated': { en: 'Updated', zh: '更新于' },
  'meta.notFoundTitle': { en: 'Page not found', zh: '找不到这个页面' },
  'meta.notFoundBody': {
    en: "That page has moved or never existed. Here's the way back.",
    zh: '这个页面可能已移动或从未存在。以下是回去的路。',
  },
  'meta.needsReview': {
    en: 'Awaiting confirmation from church leadership',
    zh: '内容待教会同工确认',
  },
  'meta.fallbackNotice': {
    en: 'Chinese translation coming soon — showing English for now.',
    zh: '英文版本稍后补上 —— 暂时显示中文。',
  },
  'meta.externalLink': { en: 'Opens in a new tab', zh: '在新标签页打开' },
} as const satisfies Record<string, Record<Locale, string>>;

export type UIKey = keyof typeof ui;

/**
 * Translate a UI key. Returns the key itself in development if missing,
 * which makes an untranslated string immediately visible rather than silent.
 */
export function useTranslations(locale: Locale) {
  return function t(key: UIKey): string {
    const entry = ui[key] as Record<Locale, string> | undefined;
    if (!entry) {
      if (import.meta.env.DEV) console.warn(`[i18n] missing key: ${key}`);
      return String(key);
    }
    return entry[locale] ?? entry.en;
  };
}
