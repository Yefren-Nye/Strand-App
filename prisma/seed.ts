import { getDb } from '../lib/db';

const CORPUS_WORDS = [
  // Verbs
  { id: 'corpus-mand-5001', word: '斡旋', reading: 'wòxuán', definition: 'to mediate; to use one\'s good offices to resolve a dispute', frequencyRank: 5001 },
  { id: 'corpus-mand-5002', word: '贸然', reading: 'màorán', definition: 'recklessly; hastily; without careful consideration', frequencyRank: 5002 },
  { id: 'corpus-mand-5003', word: '付诸实践', reading: 'fùzhū shíjiàn', definition: 'to put into practice; to implement', frequencyRank: 5003 },
  { id: 'corpus-mand-5004', word: '敷衍', reading: 'fūyǎn', definition: 'to be perfunctory; to do something superficially', frequencyRank: 5004 },
  { id: 'corpus-mand-5005', word: '斟酌', reading: 'zhēnzhuó', definition: 'to deliberate; to consider carefully; to weigh up', frequencyRank: 5005 },
  { id: 'corpus-mand-5006', word: '研讨', reading: 'yántǎo', definition: 'to discuss; to study and discuss; seminar', frequencyRank: 5006 },
  { id: 'corpus-mand-5007', word: '审视', reading: 'shěnshì', definition: 'to look at carefully; to scrutinise', frequencyRank: 5007 },
  { id: 'corpus-mand-5008', word: '渗透', reading: 'shèntòu', definition: 'to seep through; to permeate; to infiltrate', frequencyRank: 5008 },
  { id: 'corpus-mand-5009', word: '遏制', reading: 'èzhì', definition: 'to contain; to curb; to keep under control', frequencyRank: 5009 },
  { id: 'corpus-mand-5010', word: '折腾', reading: 'zhēteng', definition: 'to toss about; to cause trouble; to wear out', frequencyRank: 5010 },
  // Chengyu — balance and proportion
  { id: 'corpus-mand-5011', word: '举足轻重', reading: 'jǔzúqīngzhòng', definition: 'to carry great weight; of pivotal importance', frequencyRank: 5011 },
  { id: 'corpus-mand-5012', word: '错综复杂', reading: 'cuòzōng fùzá', definition: 'complex and intricate; tangled and complicated', frequencyRank: 5012 },
  { id: 'corpus-mand-5013', word: '旷日持久', reading: 'kuàngrì chíjiǔ', definition: 'protracted; long and drawn out', frequencyRank: 5013 },
  { id: 'corpus-mand-5014', word: '一如既往', reading: 'yīrú jìwǎng', definition: 'just as in the past; as always; as usual', frequencyRank: 5014 },
  { id: 'corpus-mand-5015', word: '举棋不定', reading: 'jǔqí bùdìng', definition: 'to hesitate; to be undecided; to waver', frequencyRank: 5015 },
  // Formal connectors
  { id: 'corpus-mand-5016', word: '与此同时', reading: 'yǔcǐ tóngshí', definition: 'meanwhile; at the same time; simultaneously', frequencyRank: 5016 },
  { id: 'corpus-mand-5017', word: '由此可见', reading: 'yóucǐ kějiàn', definition: 'it can thus be seen; from this it is clear', frequencyRank: 5017 },
  { id: 'corpus-mand-5018', word: '在此基础上', reading: 'zàicǐ jīchǔshàng', definition: 'on this basis; building on this', frequencyRank: 5018 },
  { id: 'corpus-mand-5019', word: '综上所述', reading: 'zōngshàng suǒshù', definition: 'in summary; to sum up; as stated above', frequencyRank: 5019 },
  { id: 'corpus-mand-5020', word: '反之', reading: 'fǎnzhī', definition: 'conversely; on the other hand; vice versa', frequencyRank: 5020 },
  // Chengyu — wisdom and epistemology
  { id: 'corpus-mand-5021', word: '不言而喻', reading: 'bùyán éryù', definition: 'self-evident; goes without saying', frequencyRank: 5021 },
  { id: 'corpus-mand-5022', word: '息息相关', reading: 'xīxī xiāngguān', definition: 'closely related; intimately connected', frequencyRank: 5022 },
  { id: 'corpus-mand-5023', word: '循序渐进', reading: 'xúnxù jiànjìn', definition: 'step by step; in a gradual, orderly way', frequencyRank: 5023 },
  { id: 'corpus-mand-5024', word: '不可或缺', reading: 'bùkě huòquē', definition: 'indispensable; essential; cannot be dispensed with', frequencyRank: 5024 },
  { id: 'corpus-mand-5025', word: '相辅相成', reading: 'xiāngfǔ xiāngchéng', definition: 'complementary; to supplement each other', frequencyRank: 5025 },
  { id: 'corpus-mand-5026', word: '恰如其分', reading: 'qiàrú qífèn', definition: 'just right; apt; appropriate to the occasion', frequencyRank: 5026 },
  { id: 'corpus-mand-5027', word: '因势利导', reading: 'yīnshì lìdǎo', definition: 'to guide according to circumstances; to make the best of the situation', frequencyRank: 5027 },
  { id: 'corpus-mand-5028', word: '防微杜渐', reading: 'fángwēi dùjiàn', definition: 'to nip problems in the bud; to guard against small faults', frequencyRank: 5028 },
  { id: 'corpus-mand-5029', word: '力所能及', reading: 'lìsuǒnéngjí', definition: 'within one\'s power or ability; as much as one can', frequencyRank: 5029 },
  { id: 'corpus-mand-5030', word: '当务之急', reading: 'dāngwù zhī jí', definition: 'the most pressing task; the matter of the moment', frequencyRank: 5030 },
  // Nouns — political, intellectual, social
  { id: 'corpus-mand-5031', word: '博弈', reading: 'bóyì', definition: 'game theory; contest of strategy; competition', frequencyRank: 5031 },
  { id: 'corpus-mand-5032', word: '契机', reading: 'qìjī', definition: 'opportunity; turning point; key moment', frequencyRank: 5032 },
  { id: 'corpus-mand-5033', word: '格局', reading: 'géjú', definition: 'structure; pattern; overall configuration; big picture', frequencyRank: 5033 },
  { id: 'corpus-mand-5034', word: '痛点', reading: 'tòngdiǎn', definition: 'pain point; problem area; weak spot', frequencyRank: 5034 },
  { id: 'corpus-mand-5035', word: '共识', reading: 'gòngshí', definition: 'consensus; common ground; shared understanding', frequencyRank: 5035 },
  { id: 'corpus-mand-5036', word: '底线', reading: 'dǐxiàn', definition: 'bottom line; red line; absolute minimum', frequencyRank: 5036 },
  { id: 'corpus-mand-5037', word: '纽带', reading: 'niǔdài', definition: 'bond; link; tie; connecting thread', frequencyRank: 5037 },
  { id: 'corpus-mand-5038', word: '瓶颈', reading: 'píngjǐng', definition: 'bottleneck; chokepoint; limiting constraint', frequencyRank: 5038 },
  { id: 'corpus-mand-5039', word: '立场', reading: 'lìchǎng', definition: 'position; standpoint; stance', frequencyRank: 5039 },
  { id: 'corpus-mand-5040', word: '层面', reading: 'céngmiàn', definition: 'level; dimension; plane of analysis', frequencyRank: 5040 },
  // More chengyu
  { id: 'corpus-mand-5041', word: '有的放矢', reading: 'yǒudì fàngshǐ', definition: 'to have a definite target; purposeful; to the point', frequencyRank: 5041 },
  { id: 'corpus-mand-5042', word: '推陈出新', reading: 'tuīchén chūxīn', definition: 'to discard the old and bring forth the new; to innovate', frequencyRank: 5042 },
  { id: 'corpus-mand-5043', word: '实事求是', reading: 'shíshì qiúshì', definition: 'to seek truth from facts; pragmatic; empirical', frequencyRank: 5043 },
  { id: 'corpus-mand-5044', word: '触类旁通', reading: 'chùlèi pángtōng', definition: 'to draw inferences from one case to others; to understand by analogy', frequencyRank: 5044 },
  { id: 'corpus-mand-5045', word: '融会贯通', reading: 'rónghùi guàntōng', definition: 'to have a thorough mastery; to integrate knowledge into a coherent whole', frequencyRank: 5045 },
  // Verbs — formal register
  { id: 'corpus-mand-5046', word: '阐述', reading: 'chǎnshù', definition: 'to expound; to elaborate; to set forth', frequencyRank: 5046 },
  { id: 'corpus-mand-5047', word: '剖析', reading: 'pōuxī', definition: 'to analyse; to dissect; to examine in depth', frequencyRank: 5047 },
  { id: 'corpus-mand-5048', word: '权衡', reading: 'quánhéng', definition: 'to weigh; to balance; to consider the pros and cons', frequencyRank: 5048 },
  { id: 'corpus-mand-5049', word: '涵盖', reading: 'hángài', definition: 'to encompass; to cover; to include', frequencyRank: 5049 },
  { id: 'corpus-mand-5050', word: '折射', reading: 'zhéshè', definition: 'to refract; (figuratively) to reflect or reveal', frequencyRank: 5050 },
  // Abstract nouns
  { id: 'corpus-mand-5051', word: '愿景', reading: 'yuànjǐng', definition: 'vision; aspiration; desired future state', frequencyRank: 5051 },
  { id: 'corpus-mand-5052', word: '路径', reading: 'lùjìng', definition: 'path; route; approach; course of action', frequencyRank: 5052 },
  { id: 'corpus-mand-5053', word: '机制', reading: 'jīzhì', definition: 'mechanism; system; institutional structure', frequencyRank: 5053 },
  { id: 'corpus-mand-5054', word: '边界', reading: 'biānjìe', definition: 'boundary; border; limit', frequencyRank: 5054 },
  { id: 'corpus-mand-5055', word: '前提', reading: 'qiántí', definition: 'precondition; premise; prerequisite', frequencyRank: 5055 },
  // Formal connectors
  { id: 'corpus-mand-5056', word: '尽管如此', reading: 'jǐnguǎn rúcǐ', definition: 'even so; nevertheless; despite this', frequencyRank: 5056 },
  { id: 'corpus-mand-5057', word: '就此而言', reading: 'jiùcǐ éryán', definition: 'in this regard; on this point; speaking of which', frequencyRank: 5057 },
  { id: 'corpus-mand-5058', word: '相较而言', reading: 'xiāngjiào éryán', definition: 'comparatively speaking; by comparison', frequencyRank: 5058 },
  // Final chengyu
  { id: 'corpus-mand-5059', word: '事半功倍', reading: 'shìbàn gōngbèi', definition: 'to get twice the result with half the effort; highly efficient', frequencyRank: 5059 },
  { id: 'corpus-mand-5060', word: '势在必行', reading: 'shìzài bìxíng', definition: 'absolutely necessary; imperative given the circumstances', frequencyRank: 5060 },
];

function main() {
  const db = getDb();
  console.log('Seeding database...');

  // Upsert user
  db.prepare(`
    INSERT INTO User (id, name, targetLanguage, nativeLanguage, level, hardcoreMode)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO NOTHING
  `).run('seed-user-ay', 'AY', 'Mandarin Chinese', 'English', 'HSK6', 0);

  console.log('Created user: AY');

  // Upsert default profile for AY
  db.prepare(`
    INSERT INTO Profile (id, userId, targetLanguage, nativeLanguage, level, isActive)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO NOTHING
  `).run('seed-profile-ay', 'seed-user-ay', 'Mandarin Chinese', 'English', 'HSK6', 1);

  console.log('Created profile: AY (Mandarin Chinese / HSK6)');

  // Link existing sessions to the profile
  db.prepare(`UPDATE Session SET profileId = 'seed-profile-ay' WHERE profileId IS NULL AND userId = 'seed-user-ay'`).run();
  db.prepare(`UPDATE UserWord SET profileId = 'seed-profile-ay' WHERE profileId IS NULL AND userId = 'seed-user-ay'`).run();
  db.prepare(`UPDATE StrandBalance SET profileId = 'seed-profile-ay' WHERE profileId IS NULL AND userId = 'seed-user-ay'`).run();

  const insertWord = db.prepare(`
    INSERT INTO CorpusWord (id, language, word, reading, definition, frequencyRank, level)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO NOTHING
  `);

  const insertMany = db.transaction((words: typeof CORPUS_WORDS) => {
    for (const w of words) {
      insertWord.run(w.id, 'Mandarin Chinese', w.word, w.reading, w.definition, w.frequencyRank, 'post-HSK6');
    }
  });

  insertMany(CORPUS_WORDS);
  console.log(`Seeded ${CORPUS_WORDS.length} corpus words.`);
  console.log('Done.');
}

main();
