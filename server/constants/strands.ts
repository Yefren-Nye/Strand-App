export enum Strand {
  INPUT = 'INPUT',
  OUTPUT = 'OUTPUT',
  FORM = 'FORM',
  FLUENCY = 'FLUENCY',
}

export interface StrandMeta {
  label: string;
  description: string;
  color: string;
  targetPercentage: number;
  longDescription: string;
}

export const STRAND_META: Record<Strand, StrandMeta> = {
  [Strand.INPUT]: {
    label: 'Input',
    description: 'Read or listen to something in your target language.',
    longDescription:
      'Input is comprehensible content in your target language — reading or listening to material slightly above your current level. The goal is to absorb patterns, vocabulary, and structures naturally without stopping to analyse.',
    color: '#378ADD',
    targetPercentage: 25,
  },
  [Strand.OUTPUT]: {
    label: 'Output',
    description: 'Speak or write freely in your target language.',
    longDescription:
      'Output is producing language — speaking or writing without a script. It forces you to retrieve and deploy what you know, exposing gaps that input alone won\'t reveal. The goal is fluency under pressure, not perfection.',
    color: '#1D9E75',
    targetPercentage: 25,
  },
  [Strand.FORM]: {
    label: 'Form',
    description: 'Do focused study — grammar, vocabulary, or pronunciation.',
    longDescription:
      'Form is deliberate study of the mechanics of the language — grammar rules, vocabulary review, tones, or pronunciation. Unlike the other strands, it is analytical. Use it to fill specific gaps, not as a substitute for the other three.',
    color: '#EF9F27',
    targetPercentage: 25,
  },
  [Strand.FLUENCY]: {
    label: 'Fluency',
    description: 'Practise with material you already know, at speed.',
    longDescription:
      'Fluency practice is going back to material you have already understood and repeating it at native speed — shadowing, re-reading, or re-listening. The goal is to make known language automatic and effortless.',
    color: '#D4537E',
    targetPercentage: 25,
  },
};

export const STRAND_ORDER: Strand[] = [
  Strand.INPUT,
  Strand.OUTPUT,
  Strand.FORM,
  Strand.FLUENCY,
];

// Language-specific example activities, keyed by target language name.
// 'default' is used for any language not explicitly listed.
export const STRAND_EXAMPLES: Record<
  string,
  Record<Strand, string[]>
> = {
  'Mandarin Chinese': {
    [Strand.INPUT]: [
      'Read a 财新 (Caixin) or 人民日报 article without a dictionary — focus on getting the gist.',
      'Listen to a full episode of a Chinese podcast (e.g. 大山来了 or HSK-level podcasts).',
      'Watch a CGTN news segment with Chinese subtitles; do not pause.',
      'Read a WeChat public account post on a topic you follow.',
      'Listen to a Mandarin Corner or ChinesePod dialogue at normal speed.',
      'Read a short story from an HSK reader without looking up words.',
      'Watch 10 minutes of a Chinese drama without subtitles.',
    ],
    [Strand.OUTPUT]: [
      'Record a two-minute voice memo in Mandarin summarising what you read today.',
      'Write a 100-character WeChat-style post about something that happened to you.',
      'Use HelloTalk or Tandem to send a voice message to a language partner.',
      'Write three sentences in Mandarin about a topic from the news.',
      'Describe a photo or scene in Mandarin out loud for two minutes.',
      'Write a short diary entry in Mandarin — don\'t edit, just produce.',
      'Post a short reply in Mandarin in a Chinese-learning community.',
    ],
    [Strand.FORM]: [
      'Review 10–20 vocabulary cards in your SRS deck (Anki or the in-app review).',
      'Study one grammar pattern you frequently get wrong and write three example sentences.',
      'Drill the tones of 10 new words you encountered this week.',
      'Work through a HSK grammar exercise focusing on 把 or 被 constructions.',
      'Use Pleco to look up a word deeply — etymology, example sentences, compounds.',
      'Write out 5 chengyu you\'ve seen recently with their meanings and one example each.',
      'Practise writing characters for 10 words you know by sound but not by hand.',
    ],
    [Strand.FLUENCY]: [
      'Shadow a CGTN clip or news broadcast — speak along with the audio in real time.',
      'Re-read an article you already understood — aim for twice the speed of first reading.',
      'Listen to a podcast episode you have already heard once and shadow the speaker.',
      'Re-watch a scene from a Chinese drama you have already seen, speaking along.',
      'Read a dialogue you studied last week aloud, aiming for natural rhythm.',
      'Shadow a Mandarin Corner interview clip from start to finish without stopping.',
      'Listen to a familiar song in Mandarin and sing or speak along.',
    ],
  },
  default: {
    [Strand.INPUT]: [
      'Read a news article in your target language without pausing to look words up.',
      'Listen to a podcast or radio programme in your target language.',
      'Watch a short video or clip without subtitles in your first language.',
      'Read a short story or graded reader appropriate for your level.',
      'Listen to a song in your target language and follow the lyrics.',
      'Read social media posts or comments in your target language.',
      'Watch a documentary in your target language with target-language subtitles.',
    ],
    [Strand.OUTPUT]: [
      'Record a two-minute spoken summary of something you read or heard today.',
      'Write a short journal entry — do not edit, just produce freely.',
      'Send a voice message to a language partner or use a conversation app.',
      'Write three sentences about your day in your target language.',
      'Describe a picture out loud in your target language for two minutes.',
      'Post a short reply in your target language in an online community.',
      'Speak your thoughts aloud in your target language for two minutes.',
    ],
    [Strand.FORM]: [
      'Review vocabulary cards in your SRS deck.',
      'Study one grammar point and write three example sentences.',
      'Focus on a pronunciation feature you frequently get wrong.',
      'Look up a word deeply — usage examples, collocations, related forms.',
      'Do a grammar exercise from a textbook or worksheet.',
      'Write out new vocabulary with definitions and example sentences.',
      'Practise writing or typing in your target language script.',
    ],
    [Strand.FLUENCY]: [
      'Shadow a short audio clip — speak exactly along with the speaker.',
      'Re-read something you have already understood, aiming for double the speed.',
      'Re-listen to a podcast episode you have already heard.',
      'Re-watch a clip or scene you have already studied.',
      'Read a dialogue or text you know aloud, focusing on natural rhythm.',
      'Shadow a conversation at native speed from start to finish.',
      'Repeat a short passage until it feels automatic.',
    ],
  },
};
