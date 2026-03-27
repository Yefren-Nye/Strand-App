import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CORPUS_WORDS = [
  // Verbs
  { word: '斡旋', reading: 'wòxuán', definition: 'to mediate; to use one\'s good offices to resolve a dispute', frequencyRank: 5001 },
  { word: '贸然', reading: 'màorán', definition: 'recklessly; hastily; without careful consideration', frequencyRank: 5002 },
  { word: '付诸实践', reading: 'fùzhū shíjiàn', definition: 'to put into practice; to implement', frequencyRank: 5003 },
  { word: '敷衍', reading: 'fūyǎn', definition: 'to be perfunctory; to do something superficially', frequencyRank: 5004 },
  { word: '斟酌', reading: 'zhēnzhuó', definition: 'to deliberate; to consider carefully; to weigh up', frequencyRank: 5005 },
  { word: '研讨', reading: 'yántǎo', definition: 'to discuss; to study and discuss; seminar', frequencyRank: 5006 },
  { word: '审视', reading: 'shěnshì', definition: 'to look at carefully; to scrutinise', frequencyRank: 5007 },
  { word: '渗透', reading: 'shèntòu', definition: 'to seep through; to permeate; to infiltrate', frequencyRank: 5008 },
  { word: '遏制', reading: 'èzhì', definition: 'to contain; to curb; to keep under control', frequencyRank: 5009 },
  { word: '折腾', reading: 'zhēteng', definition: 'to toss about; to cause trouble; to wear out', frequencyRank: 5010 },
  // Chengyu — balance and proportion
  { word: '举足轻重', reading: 'jǔzúqīngzhòng', definition: 'to carry great weight; of pivotal importance', frequencyRank: 5011 },
  { word: '错综复杂', reading: 'cuòzōng fùzá', definition: 'complex and intricate; tangled and complicated', frequencyRank: 5012 },
  { word: '旷日持久', reading: 'kuàngrì chíjiǔ', definition: 'protracted; long and drawn out', frequencyRank: 5013 },
  { word: '一如既往', reading: 'yīrú jìwǎng', definition: 'just as in the past; as always; as usual', frequencyRank: 5014 },
  { word: '举棋不定', reading: 'jǔqí bùdìng', definition: 'to hesitate; to be undecided; to waver', frequencyRank: 5015 },
  // Formal connectors
  { word: '与此同时', reading: 'yǔcǐ tóngshí', definition: 'meanwhile; at the same time; simultaneously', frequencyRank: 5016 },
  { word: '由此可见', reading: 'yóucǐ kějiàn', definition: 'it can thus be seen; from this it is clear', frequencyRank: 5017 },
  { word: '在此基础上', reading: 'zàicǐ jīchǔshàng', definition: 'on this basis; building on this', frequencyRank: 5018 },
  { word: '综上所述', reading: 'zōngshàng suǒshù', definition: 'in summary; to sum up; as stated above', frequencyRank: 5019 },
  { word: '反之', reading: 'fǎnzhī', definition: 'conversely; on the other hand; vice versa', frequencyRank: 5020 },
  // Chengyu — wisdom and epistemology
  { word: '不言而喻', reading: 'bùyán éryù', definition: 'self-evident; goes without saying', frequencyRank: 5021 },
  { word: '息息相关', reading: 'xīxī xiāngguān', definition: 'closely related; intimately connected', frequencyRank: 5022 },
  { word: '循序渐进', reading: 'xúnxù jiànjìn', definition: 'step by step; in a gradual, orderly way', frequencyRank: 5023 },
  { word: '不可或缺', reading: 'bùkě huòquē', definition: 'indispensable; essential; cannot be dispensed with', frequencyRank: 5024 },
  { word: '相辅相成', reading: 'xiāngfǔ xiāngchéng', definition: 'complementary; to supplement each other', frequencyRank: 5025 },
  { word: '恰如其分', reading: 'qiàrú qífèn', definition: 'just right; apt; appropriate to the occasion', frequencyRank: 5026 },
  { word: '因势利导', reading: 'yīnshì lìdǎo', definition: 'to guide according to circumstances; to make the best of the situation', frequencyRank: 5027 },
  { word: '防微杜渐', reading: 'fángwēi dùjiàn', definition: 'to nip problems in the bud; to guard against small faults', frequencyRank: 5028 },
  { word: '力所能及', reading: 'lìsuǒnéngjí', definition: 'within one\'s power or ability; as much as one can', frequencyRank: 5029 },
  { word: '当务之急', reading: 'dāngwù zhī jí', definition: 'the most pressing task; the matter of the moment', frequencyRank: 5030 },
  // Nouns — political, intellectual, social
  { word: '博弈', reading: 'bóyì', definition: 'game theory; contest of strategy; competition', frequencyRank: 5031 },
  { word: '契机', reading: 'qìjī', definition: 'opportunity; turning point; key moment', frequencyRank: 5032 },
  { word: '格局', reading: 'géjú', definition: 'structure; pattern; overall configuration; big picture', frequencyRank: 5033 },
  { word: '痛点', reading: 'tòngdiǎn', definition: 'pain point; problem area; weak spot', frequencyRank: 5034 },
  { word: '共识', reading: 'gòngshí', definition: 'consensus; common ground; shared understanding', frequencyRank: 5035 },
  { word: '底线', reading: 'dǐxiàn', definition: 'bottom line; red line; absolute minimum', frequencyRank: 5036 },
  { word: '纽带', reading: 'niǔdài', definition: 'bond; link; tie; connecting thread', frequencyRank: 5037 },
  { word: '瓶颈', reading: 'píngjǐng', definition: 'bottleneck; chokepoint; limiting constraint', frequencyRank: 5038 },
  { word: '立场', reading: 'lìchǎng', definition: 'position; standpoint; stance', frequencyRank: 5039 },
  { word: '层面', reading: 'céngmiàn', definition: 'level; dimension; plane of analysis', frequencyRank: 5040 },
  // More chengyu
  { word: '有的放矢', reading: 'yǒudì fàngshǐ', definition: 'to have a definite target; purposeful; to the point', frequencyRank: 5041 },
  { word: '推陈出新', reading: 'tuīchén chūxīn', definition: 'to discard the old and bring forth the new; to innovate', frequencyRank: 5042 },
  { word: '实事求是', reading: 'shíshì qiúshì', definition: 'to seek truth from facts; pragmatic; empirical', frequencyRank: 5043 },
  { word: '触类旁通', reading: 'chùlèi pángtōng', definition: 'to draw inferences from one case to others; to understand by analogy', frequencyRank: 5044 },
  { word: '融会贯通', reading: 'rónghùi guàntōng', definition: 'to have a thorough mastery; to integrate knowledge into a coherent whole', frequencyRank: 5045 },
  // Verbs — formal register
  { word: '阐述', reading: 'chǎnshù', definition: 'to expound; to elaborate; to set forth', frequencyRank: 5046 },
  { word: '剖析', reading: 'pōuxī', definition: 'to analyse; to dissect; to examine in depth', frequencyRank: 5047 },
  { word: '权衡', reading: 'quánhéng', definition: 'to weigh; to balance; to consider the pros and cons', frequencyRank: 5048 },
  { word: '涵盖', reading: 'hángài', definition: 'to encompass; to cover; to include', frequencyRank: 5049 },
  { word: '折射', reading: 'zhéshè', definition: 'to refract; (figuratively) to reflect or reveal', frequencyRank: 5050 },
  // Abstract nouns
  { word: '愿景', reading: 'yuànjǐng', definition: 'vision; aspiration; desired future state', frequencyRank: 5051 },
  { word: '路径', reading: 'lùjìng', definition: 'path; route; approach; course of action', frequencyRank: 5052 },
  { word: '机制', reading: 'jīzhì', definition: 'mechanism; system; institutional structure', frequencyRank: 5053 },
  { word: '边界', reading: 'biānjìe', definition: 'boundary; border; limit', frequencyRank: 5054 },
  { word: '前提', reading: 'qiántí', definition: 'precondition; premise; prerequisite', frequencyRank: 5055 },
  // Formal connectors
  { word: '尽管如此', reading: 'jǐnguǎn rúcǐ', definition: 'even so; nevertheless; despite this', frequencyRank: 5056 },
  { word: '就此而言', reading: 'jiùcǐ éryán', definition: 'in this regard; on this point; speaking of which', frequencyRank: 5057 },
  { word: '相较而言', reading: 'xiāngjiào éryán', definition: 'comparatively speaking; by comparison', frequencyRank: 5058 },
  // Final chengyu
  { word: '事半功倍', reading: 'shìbàn gōngbèi', definition: 'to get twice the result with half the effort; highly efficient', frequencyRank: 5059 },
  { word: '势在必行', reading: 'shìzài bìxíng', definition: 'absolutely necessary; imperative given the circumstances', frequencyRank: 5060 },
];

async function main() {
  console.log('Seeding database...');

  const user = await prisma.user.upsert({
    where: { name: 'AY' },
    update: {},
    create: {
      id: 'seed-user-ay',
      name: 'AY',
      targetLanguage: 'Mandarin Chinese',
      nativeLanguage: 'English',
      level: 'HSK6',
    },
  });
  console.log('Upserted user:', user.name);

  const profile = await prisma.profile.upsert({
    where: { id: 'seed-profile-ay' },
    update: {},
    create: {
      id: 'seed-profile-ay',
      userId: user.id,
      targetLanguage: 'Mandarin Chinese',
      nativeLanguage: 'English',
      level: 'HSK6',
      isActive: true,
    },
  });
  console.log('Upserted profile:', profile.id);

  for (const w of CORPUS_WORDS) {
    await prisma.corpusWord.upsert({
      where: { language_word: { language: 'Mandarin Chinese', word: w.word } },
      update: {
        reading: w.reading,
        definition: w.definition,
        frequencyRank: w.frequencyRank,
      },
      create: {
        language: 'Mandarin Chinese',
        word: w.word,
        reading: w.reading,
        definition: w.definition,
        frequencyRank: w.frequencyRank,
        level: 'post-HSK6',
      },
    });
  }
  console.log(`Upserted ${CORPUS_WORDS.length} corpus words.`);
  console.log('Done.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
