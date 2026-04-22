import React, { useState, useEffect } from 'react';
import { CheckCircle2, Circle, RefreshCw, ClipboardList, ChevronDown, ChevronUp, Home, Building, FileText, KeyRound, Download, CloudUpload, User, FileSpreadsheet, Plus, LogOut, LogIn, Trash2, Users, Search, Eye, PenTool, Settings, CheckSquare, Menu, X, Folder, Archive, Link as LinkIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import { db, auth, signInWithGoogle, logOut } from './firebase';
import { collection, doc, onSnapshot, setDoc, updateDoc, deleteDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

type Task = {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  data?: any;
};

type FactorType = 'text' | 'textarea' | 'select' | 'checkbox_group' | 'date' | 'fee_timing_group';

type Factor = {
  id: string;
  title: string;
  type: FactorType;
  value: any;
  options?: string[];
  placeholder?: string;
};

type Phase = {
  id: string;
  title: string;
  iconName: string;
  tasks: Task[];
  factors?: Factor[];
};

const HOKKAIDO_STATIONS: Record<string, string[]> = {
  // 地下鉄
  '南北線': ['麻生', '北３４条', '北２４条', '北１８条', '北１２条', 'さっぽろ', '大通', 'すすきの', '中島公園', '幌平橋', '中の島', '平岸', '南平岸', '澄川', '自衛隊前', '真駒内'],
  '東西線': ['宮の沢', '発寒南', '琴似', '二十四軒', '西２８丁目', '円山公園', '西１８丁目', '西１１丁目', '大通', 'バスセンター前', '菊水', '東札幌', '白石', '南郷７丁目', '南郷１３丁目', '南郷１８丁目', '大谷地', 'ひばりが丘', '新さっぽろ'],
  '東豊線': ['栄町', '新道東', '元町', '環状通東', '東区役所前', '北１３条東', 'さっぽろ', '大通', '豊水すすきの', '学園前', '豊平公園', '美園', '月寒中央', '福住'],
  
  // JR
  '函館本線': ['函館', '五稜郭', '桔梗', '七飯', '大沼公園', '森', '八雲', '長万部', '倶知安', '余市', '小樽', '小樽築港', '銭函', '星置', '手稲', '発寒', '琴似', '桑園', '札幌', '苗穂', '白石', '大麻', '野幌', '江別', '岩見沢', '美唄', '砂川', '滝川', '深川', '旭川'],
  '千歳線': ['札幌', '苗穂', '白石', '平和', '新札幌', '上野幌', '北広島', '島松', '恵み野', '恵庭', 'サッポロビール庭園', '長都', '千歳', '南千歳', '新千歳空港', '植苗', '沼ノ端', '苫小牧'],
  '札沼線': ['札幌', '桑園', '八軒', '新川', '新琴似', '太平', '百合が原', '篠路', '拓北', 'あいの里教育大', 'あいの里公園', 'ロイズタウン', '太美', '当別', '北海道医療大学'],
  '根室本線': ['滝川', '赤平', '芦別', '富良野', '幾寅', '新得', '十勝清水', '芽室', '西帯広', '帯広', '札内', '幕別', '利別', '池田', '浦幌', '厚内', '音別', '白糠', '大楽毛', '新富士', '釧路', '東釧路', '武佐', '別保', '厚岸', '茶内', '浜中', '厚床', '別当賀', '落石', '昆布盛', '西和田', '花咲', '東根室', '根室'],
  '室蘭本線': ['長万部', '洞爺', '伊達紋別', '東室蘭', '室蘭', '登別', '白老', '苫小牧', '追分', '岩見沢'],
  '石勝線': ['南千歳', '追分', '川端', '新夕張', '占冠', 'トマム', '新得'],
  '富良野線': ['旭川', '神楽岡', '緑が丘', '西御料', '西聖和', '千代ヶ岡', '北美瑛', '美瑛', '美馬牛', '上富良野', '西中', '中富良野', 'ラベンダー畑', '鹿討', '学田', '富良野'],
  '宗谷本線': ['旭川', '永山', '比布', '和寒', '剣淵', '士別', '多寄', '風連', '名寄', '美深', '音威子府', '天塩中川', '幌延', '豊富', '兜沼', '南稚内', '稚内'],
  '石北本線': ['旭川', '東旭川', '当麻', '上川', '白滝', '丸瀬布', '遠軽', '生野', '安国', '生田原', '留辺蘂', '相内', '東相内', '西北見', '北見', '柏陽', '愛野', '端野', '緋牛内', '美幌', '女満別', '呼人', '網走'],
  '釧網本線': ['網走', '藻琴', '北浜', '浜小清水', '止別', '知床斜里', '清里町', '緑', '川湯温泉', '摩周', '磯分内', '標茶', '茅沼', '塘路', '細岡', '遠矢', '東釧路', '釧路'],
  '日高本線': ['苫小牧', '勇払', '浜厚真', '鵡川'],
  '留萌本線': ['深川', '北一已', '秩父別', '北秩父別', '石狩沼田', '真布', '恵比島', '峠下', '幌糠', '藤山', '大和田', '留萌'],
  
  // 新幹線
  '北海道新幹線': ['新青森', '奥津軽いまべつ', '木古内', '新函館北斗'],

  // 市電・路面電車
  '札幌市軌道線': ['西４丁目', '西８丁目', '中央区役所前', '西１１丁目', '資生館小学校前', 'すすきの', '狸小路', '静修学園前', '行啓通', '中島公園通', '山鼻９条', '東本願寺前'],
  '函館市電本線湯川線': ['湯の川', '湯の川温泉', '函館アリーナ前', '駒場車庫前', '競馬場前', '深堀町', '柏木町', '杉並町', '五稜郭公園前', '中央病院前', '千代台', '堀川町', '昭和橋', '千歳町', '新川町', '松風町', '函館駅前', '市役所前', '魚市場通', '十字街'],
  '函館市電宝来谷地頭線': ['十字街', '宝来町', '青柳町', '谷地頭'],

  // その他
  '道南いさりび鉄道': ['五稜郭', '七重浜', '久根別', '清川口', '上磯', '茂辺地', '渡島当別', '釜谷', 'サラキ岬', '泉沢', '札苅', '木古内']
};

const initialData: Phase[] = [
  {
    id: 'phase-1',
    title: '1. 顧客要望・身元確認 (ヒアリング)',
    iconName: 'user',
    factors: [
      { id: 'f1-visit', title: '来店のきっかけ', type: 'checkbox_group', value: [], options: ['ご紹介', '引越し予定の地域にあったから', '会社名を知っていたから', '以前にも利用したことがあったから', '今の住まいから近所だから', '会社から指定されて', '物件看板', '当社ホームページ', 'Facebook', 'Instagram', 'SUUMO', 'その他'] },
      { id: 'f1-visit-other', title: 'その他のきっかけ詳細', type: 'text', value: '', placeholder: '具体的なきっかけをご記入ください' },
      { id: 'f1-reason', title: '引っ越し理由', type: 'checkbox_group', value: [], options: ['入学', '就職', '転勤', '結婚', '別居', '短期入居', '独立', '契約満了', '現居改善', '家族増員', 'ペットを飼う', '通勤通学不便', '家賃を安く', '駐車場改善', '契約条件違反', 'その他'] },
      { id: 'f1-reason-other', title: 'その他の理由詳細', type: 'text', value: '', placeholder: '具体的な理由をご記入ください' },
      { id: 'f1-name', title: 'お客様氏名', type: 'text', value: '', placeholder: '氏名' },
      { id: 'f1-kana', title: 'フリガナ', type: 'text', value: '', placeholder: 'フリガナ' },
      { id: 'f1-type', title: '個人/法人', type: 'select', value: '', options: ['個人', '法人'] },
      { id: 'f1-gender', title: '性別', type: 'select', value: '', options: ['男', '女'] },
      { id: 'f1-birth', title: '生年月日', type: 'date', value: '' },
      { id: 'f1-phone', title: '携帯電話', type: 'text', value: '', placeholder: '090-0000-0000' },
      { id: 'f1-address', title: 'ご住所', type: 'text', value: '', placeholder: '〒' },
      { id: 'f1-email', title: 'メールアドレス', type: 'text', value: '', placeholder: 'example@email.com' },
      { id: 'f1-relation', title: '借主との関係', type: 'select', value: '', options: ['本人(借主)', '夫', '妻', '子供', '親', '兄弟', '親戚', '上司・同僚', '代理人', '友人', '社宅担当者', '社宅代行業者', '法人入居者', 'その他'] },
      { id: 'f1-relation-other', title: 'その他の関係詳細', type: 'text', value: '', placeholder: '具体的な関係をご記入ください' },
      { id: 'f1-job', title: '職業について', type: 'select', value: '', options: ['学生（新入生）', '学生（在校生）', '正社員', 'アルバイト・パート', '契約社員・準社員', '役員・経営者', '無職', 'その他'] },
      { id: 'f1-job-other', title: 'その他の職業詳細', type: 'text', value: '', placeholder: '具体的な職業をご記入ください' },
      { id: 'f1-jobtype', title: '職業種別', type: 'select', value: '', options: ['会社員', '公務員', 'フリーター', '自営業', '求職', 'その他'] },
      { id: 'f1-jobtype-other', title: 'その他の職業種別詳細', type: 'text', value: '', placeholder: '具体的な職業種別をご記入ください' },
      { id: 'f1-company', title: '勤務先・学校名', type: 'text', value: '', placeholder: '名称' },
      { id: 'f1-company-addr', title: '勤務先所在地', type: 'text', value: '', placeholder: '所在地' },
      { id: 'f1-company-tel', title: '勤務先電話番号', type: 'text', value: '', placeholder: '03-0000-0000' },
      { id: 'f1-income', title: '税込年収', type: 'text', value: '', placeholder: '例: 400万円' },
      { id: 'f1-tenure', title: '勤続年数', type: 'text', value: '', placeholder: '例: 3年' },
      { id: 'f1-occupants-count', title: '入居人数', type: 'select', value: '', options: ['1名', '2名', 'その他'] },
      { id: 'f1-occupants-count-other', title: '入居人数（その他）', type: 'text', value: '', placeholder: '人数を入力してください' },
      { id: 'f1-occupants-type', title: '入居者構成・続柄', type: 'checkbox_group', value: [], options: ['学生（男）', '学生（女）', '独身（男）', '独身（女）', '単身赴任', '友人', '兄弟', '同居（同棲）', '夫婦', '夫婦・子', '親・夫婦・子', '母・子', '高齢者', '身体障がい者'] },
      { id: 'f1-occupants-disability-detail', title: '身体障がいの詳細', type: 'textarea', value: '', placeholder: '詳細についてご記入ください' },
      { id: 'f1-guarantor', title: '保証人の予定', type: 'select', value: '', options: ['親', '兄弟', '子供', '親戚', '上司・同僚', '友達', '検討中', '保証人不要物件', 'その他'] },
      { id: 'f1-guarantor-other', title: 'その他の保証人詳細', type: 'text', value: '', placeholder: '具体的な保証人をご記入ください' },
      { id: 'f1-area', title: '希望区', type: 'checkbox_group', value: [], options: ['中央', '西', '手稲', '北', '東', '白石', '厚別', '豊平', '清田', '南', '近郊', 'その他'] },
      { id: 'f1-area-other', title: 'その他の希望区詳細', type: 'text', value: '', placeholder: '具体的な希望区をご記入ください' },
      { id: 'f1-line-category', title: '希望沿線種別', type: 'checkbox_group', value: [], options: ['北海道新幹線', 'JR北海道', '札幌地下鉄', '市電・路面電車', '道南いさりび鉄道', 'バス・その他'] },
      { id: 'f1-line-sub-jr', title: 'JR北海道 路線選択', type: 'checkbox_group', value: [], options: ['函館本線', '札沼線', '千歳線', '石勝線', '室蘭本線', '日高本線', '留萌本線', '根室本線', '富良野線', '宗谷本線', '石北本線', '釧網本線'] },
      { id: 'f1-line-sub-subway', title: '札幌地下鉄 路線選択', type: 'checkbox_group', value: [], options: ['南北線', '東西線', '東豊線'] },
      { id: 'f1-line-sub-tram', title: '市電・路面電車 路線選択', type: 'checkbox_group', value: [], options: ['札幌市軌道線', '函館市電本線湯川線', '函館市電宝来谷地頭線'] },
      
      // Dynamic Station Fields (Rendered conditionally)
      ...Object.keys(HOKKAIDO_STATIONS).map(lineName => ({
        id: `f1-line-stations-${lineName}`,
        title: `${lineName} 駅選択`,
        type: 'checkbox_group' as FactorType,
        value: [],
        options: HOKKAIDO_STATIONS[lineName]
      })),

      { id: 'f1-line-category-other', title: 'バス・その他の沿線詳細', type: 'text', value: '', placeholder: '具体的な沿線やエリアを入力してください' },
      { id: 'f1-line-walk', title: '徒歩条件', type: 'select', value: '', options: ['指定なし', '3分以内', '5分以内', '7分以内', '10分以内', '15分以内', '20分以内'] },
      { id: 'f1-buildtype', title: '建物種類', type: 'checkbox_group', value: [], options: ['アパート', 'マンション', '分譲リース', '戸建', 'テラスハウス', '学生寮', 'ウィークリー型', 'その他'] },
      { id: 'f1-buildtype-other', title: 'その他の建物種類詳細', type: 'text', value: '', placeholder: '具体的な建物種類をご記入ください' },
      { id: 'f1-layout', title: '間取りタイプ', type: 'checkbox_group', value: [], options: ['1R・1K', '1LDK', '2LDK', '3LDK', '4LDK', '5LDK以上'] },
      { id: 'f1-rent', title: '希望家賃 (共益費・駐車代込)', type: 'text', value: '', placeholder: '上限 〇〇 万円まで' },
      { id: 'f1-fee-timing', title: '初期費用希望', type: 'fee_timing_group', value: [] },
      { id: 'f1-parking-needed', title: '駐車場利用', type: 'select', value: '', options: ['不要', '要'] },
      { id: 'f1-parking-count', title: '駐車台数', type: 'select', value: '', options: ['1台', '2台', '3台以上'] },
      { id: 'f1-car-type', title: '車種タイプ', type: 'select', value: '', options: ['軽自動車', '普通車(5ナンバー)', '普通車(3ナンバー)', '大型/SUV', 'ハイルーフ', '外車', 'その他'] },
      { id: 'f1-car-type-other', title: 'その他の車種詳細', type: 'text', value: '', placeholder: '具体的な車種を入力してください' },
      { id: 'f1-bicycle-needed', title: '駐輪場利用 (自転車・バイク)', type: 'select', value: '', options: ['不要', '要'] },
      { id: 'f1-bicycle-type', title: '駐輪タイプ', type: 'checkbox_group', value: [], options: ['自転車', '原付(50cc)', 'バイク(中型以上)'] },
      { id: 'f1-special', title: '特別条件', type: 'checkbox_group', value: [], options: ['犬', '猫', '楽器', '短期契約', '学校区', '对面K', 'エアコン', '2阶以上', '都市ガス', '高层阶', 'AL', 'テナント居抜き'] },
      { id: 'f1-pet-dog-detail', title: '犬の飼育詳細 (頭数・犬種)', type: 'text', value: '', placeholder: '例: 1頭 / トイプードル' },
      { id: 'f1-pet-cat-detail', title: '猫の飼育詳細 (頭数・種類)', type: 'text', value: '', placeholder: '例: 2匹 / アメリカンショートヘア' },
      { id: 'f1-timing', title: '引越時期', type: 'date', value: '', placeholder: '' },
      { id: 'f1-current', title: '現住居分類', type: 'select', value: '', options: ['賃貸', '持家', '社宅', '寮', '親元', '親戚宅', '友人宅', 'その他'] },
      { id: 'f1-current-other', title: 'その他の現住居分類詳細', type: 'text', value: '', placeholder: '具体的な現住居分類をご記入ください' },
      { id: 'f1-current-rent-amount', title: '現住居の家賃', type: 'text', value: '', placeholder: '例: 6.5万円' },
      { id: 'f1-current-rent-layout', title: '現住居の間取り', type: 'select', value: '', options: ['1R・1K', '1LDK', '2DK', '2LDK', '3DK', '3LDK', '4LDK以上'] },
      { id: 'f1-current-good', title: '現住居の良い点', type: 'textarea', value: '', placeholder: '良い点をご記入ください' },
      { id: 'f1-current-bad', title: '現住居の不満な点', type: 'textarea', value: '', placeholder: '不満な点をご記入ください' },
    ],
    tasks: [
      { id: 't1-1', title: 'ヒアリングシート記入', description: 'お客様の希望条件、引越理由、入居時期の詳細を確認', completed: false },
    ]
  },
  {
    id: 'phase-2',
    title: '2. 物件選定・提案',
    iconName: 'search',
    factors: [],
    tasks: [
      { id: 't2-2', title: '物件選定・確認', description: '問い合わせた物件情報をアーカイブとして記録します', completed: false, data: { properties: [] } },
    ]
  },
  {
    id: 'phase-3',
    title: '3. 内覧準備・現地確認',
    iconName: 'eye',
    factors: [
      { id: 'f3-2', title: '現地チェック項目', type: 'checkbox_group', value: [], options: ['ゴミ置き場確認', '採光・防音確認', '携帯電波確認', '部屋の向き・日当たり', 'Wi-Fi状況', '水道・電気・ガスメーターの位置', '居室・寝室の照明', 'キッチンコンロ', '換気扇', '浴室追い焚き', '浴室乾燥機', 'エアコン', '暖房 (灯油)', '暖房 (ガス)', '暖房 (電化)', '給湯器'] },
    ],
    tasks: [
      { id: 't3-1', title: '内覧予約・鍵情報確認', description: '管理会社への空室・内覧可否の確認と、鍵の手配方法（来店借用・現地暗証番号など）を記録します。', completed: false, data: { viewings: [] } },
    ]
  },
  {
    id: 'phase-4',
    title: '4. 申込・審査',
    iconName: 'file-text',
    factors: [],
    tasks: [
      { id: 't4-1', title: '申込・審査管理', description: '物件の申込手続き（申込方法・必要書類）と審査状況を管理します。', completed: false, data: { applications: [] } },
    ]
  },
  {
    id: 'phase-5',
    title: '5. 契約・決済',
    iconName: 'pen-tool',
    factors: [
      { id: 'f5-1', title: '契約形態', type: 'select', value: '', options: ['対面契約 (店舗)', 'IT重説 (オンライン)'] },
      { id: 'f5-2', title: '決済方法', type: 'select', value: '', options: ['銀行振込', 'クレジットカード', '口座振替'] },
    ],
    tasks: [
      { id: 't5-1', title: '費用明細送付', description: '初期費用の計算、請求書の送付', completed: false },
      { id: 't5-2', title: '重要事項説明', description: '宅建士による重説、契約書の署名捺印', completed: false },
      { id: 't5-3', title: '契約金入金確認', description: '期日までの着金確認', completed: false },
    ]
  },
  {
    id: 'phase-6',
    title: '6. 鍵渡し・入居',
    iconName: 'key-round',
    factors: [
      { id: 'f6-1', title: '鍵の受取', type: 'select', value: '', options: ['管理会社で直接受取', '仲介店舗で受取・手渡し'] },
      { id: 'f6-2', title: 'ライフライン手配', type: 'select', value: '', options: ['お客様自身で手配', '仲介代行手配'] },
    ],
    tasks: [
      { id: 't6-1', title: '鍵渡し', description: '鍵の引渡し、受領書のサイン', completed: false },
      { id: 't6-2', title: '入居説明', description: 'ゴミ出しルール、室内チェック表の案内', completed: false },
      { id: 't6-3', title: '取引台帳作成', description: 'プロジェクト完了、書類のファイリングと保管', completed: false },
    ]
  }
];

const renderIcon = (iconName: string) => {
  switch (iconName) {
    case 'user': return <User className="w-6 h-6" />;
    case 'search': return <Search className="w-6 h-6" />;
    case 'eye': return <Eye className="w-6 h-6" />;
    case 'file-text': return <FileText className="w-6 h-6" />;
    case 'pen-tool': return <PenTool className="w-6 h-6" />;
    case 'key-round': return <KeyRound className="w-6 h-6" />;
    default: return <ClipboardList className="w-6 h-6" />;
  }
};

const calculateAgeAndEra = (dateString: string) => {
  if (!dateString) return '';
  const birthDate = new Date(dateString);
  if (isNaN(birthDate.getTime())) return '';

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  try {
    const formatter = new Intl.DateTimeFormat('ja-JP-u-ca-japanese', { era: 'long', year: 'numeric' });
    const eraYear = formatter.format(birthDate).replace('年', '');
    return `${eraYear}年 (${age}歳)`;
  } catch (e) {
    return `${age}歳`;
  }
};

const CompositionInput = ({ value, onChange, className, placeholder, type = "text", autoFocus, disabled }: { value: string, onChange: (val: string) => void, className?: string, placeholder?: string, type?: string, autoFocus?: boolean, disabled?: boolean }) => {
  const [localValue, setLocalValue] = useState(value || '');
  const [isComposing, setIsComposing] = useState(false);

  useEffect(() => {
    if (!isComposing) {
      setLocalValue(value || '');
    }
  }, [value, isComposing]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(e.target.value);
    if (!isComposing) {
      onChange(e.target.value);
    }
  };

  const handleCompositionStart = () => setIsComposing(true);
  const handleCompositionEnd = (e: React.CompositionEvent<HTMLInputElement>) => {
    setIsComposing(false);
    onChange(e.currentTarget.value);
  };

  const handleBlur = () => {
    if (localValue !== value) {
      onChange(localValue);
    }
  };

  return (
    <input
      type={type}
      className={className}
      placeholder={placeholder}
      value={localValue}
      onChange={handleChange}
      onCompositionStart={handleCompositionStart}
      onCompositionEnd={handleCompositionEnd}
      onBlur={handleBlur}
      autoFocus={autoFocus}
      disabled={disabled}
    />
  );
};

const CompositionTextarea = ({ value, onChange, className, placeholder, rows, disabled }: { value: string, onChange: (val: string) => void, className?: string, placeholder?: string, rows?: number, disabled?: boolean }) => {
  const [localValue, setLocalValue] = useState(value || '');
  const [isComposing, setIsComposing] = useState(false);

  useEffect(() => {
    if (!isComposing) {
      setLocalValue(value || '');
    }
  }, [value, isComposing]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLocalValue(e.target.value);
    if (!isComposing) {
      onChange(e.target.value);
    }
  };

  const handleCompositionStart = () => setIsComposing(true);
  const handleCompositionEnd = (e: React.CompositionEvent<HTMLTextAreaElement>) => {
    setIsComposing(false);
    onChange(e.currentTarget.value);
  };

  const handleBlur = () => {
    if (localValue !== value) {
      onChange(localValue);
    }
  };

  return (
    <textarea
      className={className}
      placeholder={placeholder}
      value={localValue}
      onChange={handleChange}
      onCompositionStart={handleCompositionStart}
      onCompositionEnd={handleCompositionEnd}
      onBlur={handleBlur}
      rows={rows}
      disabled={disabled}
    />
  );
};

const FactorInput = ({ factor, phaseId, handleFactorChange, disabled }: { factor: Factor, phaseId: string, handleFactorChange: (phaseId: string, factorId: string, newValue: any) => void, disabled?: boolean }) => {
  if (factor.type === 'textarea') {
    return (
      <CompositionTextarea 
        value={factor.value || ''} 
        onChange={(val) => handleFactorChange(phaseId, factor.id, val)} 
        className={`w-full text-base font-serif font-normal px-0 py-3 border-b border-luxury-border focus:border-prestige-gold bg-transparent outline-none transition-all placeholder:italic placeholder:text-luxury-sage/30 resize-y min-h-[100px] ${disabled ? 'opacity-60 grayscale' : ''}`} 
        placeholder={factor.placeholder} 
        disabled={disabled}
      />
    );
  }

  return (
    <CompositionInput 
      type="text" 
      value={factor.value || ''} 
      onChange={(val) => handleFactorChange(phaseId, factor.id, val)} 
      className={`w-full text-base font-serif font-normal px-0 py-3 border-b border-luxury-border focus:border-prestige-gold bg-transparent outline-none transition-all placeholder:italic placeholder:text-luxury-sage/30 ${disabled ? 'opacity-60 grayscale' : ''}`} 
      placeholder={factor.placeholder} 
      disabled={disabled}
    />
  );
};

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true);
  
  const [checklists, setChecklists] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');

  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    '01-問合せ中案件': true,
    '02-申込中物件': true,
    '03-契約済み物件': true,
    '04-未成約の歴史アーカイブ': false,
  });

  const [expandedPhases, setExpandedPhases] = useState<Record<string, boolean>>({
    'phase-1': true,
    'phase-2': false,
    'phase-3': false,
    'phase-4': false,
    'phase-5': false,
    'phase-6': false,
  });

  // Modal states
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'alert' | 'confirm' | 'prompt';
    inputValue?: string;
    onConfirm?: (val?: string) => void;
    onCancel?: () => void;
  }>({ isOpen: false, title: '', message: '', type: 'alert' });

  const showAlert = (title: string, message: string) => {
    setModalConfig({ isOpen: true, title, message, type: 'alert', onConfirm: () => setModalConfig(prev => ({ ...prev, isOpen: false })) });
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setModalConfig({
      isOpen: true, title, message, type: 'confirm',
      onConfirm: () => { onConfirm(); setModalConfig(prev => ({ ...prev, isOpen: false })); },
      onCancel: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
    });
  };

  const showPrompt = (title: string, message: string, onConfirm: (val: string) => void) => {
    setModalConfig({
      isOpen: true, title, message, type: 'prompt', inputValue: '',
      onConfirm: (val) => { onConfirm(val || ''); setModalConfig(prev => ({ ...prev, isOpen: false })); },
      onCancel: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
    });
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!isAuthReady || !user) {
      setChecklists([]);
      return;
    }

    const q = query(collection(db, 'checklists'), orderBy('updatedAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => {
        const data = doc.data();
        let phases = JSON.parse(data.phasesData);
        
        // Merge with initialData to ensure backward compatibility and apply schema updates
        phases = phases.map((phase: Phase) => {
          const initialPhase = initialData.find(p => p.id === phase.id);
          if (initialPhase) {
            const existingTasks = phase.tasks || [];
            const mergedTasks = initialPhase.tasks.map(initialTask => {
              const existing = existingTasks.find((t: Task) => t.id === initialTask.id);
              if (existing) {
                return { 
                  ...initialTask, 
                  completed: existing.completed,
                  data: existing.data ? { ...initialTask.data, ...existing.data } : initialTask.data
                };
              }
              return initialTask;
            });

            const existingFactors = phase.factors || [];
            const mergedFactors = initialPhase.factors ? initialPhase.factors.map(initialFactor => {
              const existing = existingFactors.find((f: Factor) => f.id === initialFactor.id);
              if (existing) {
                return { ...initialFactor, value: existing.value };
              }
              return initialFactor;
            }) : undefined;

            return { ...phase, tasks: mergedTasks, factors: mergedFactors };
          }
          return phase;
        });

        return {
          id: doc.id,
          ...data,
          phases: phases
        };
      });
      setChecklists(list);
      
      if (list.length > 0 && !selectedId) {
        setSelectedId(list[0].id);
      } else if (list.length === 0) {
        setSelectedId(null);
      }
    }, (error) => {
      console.error("Snapshot error:", error);
      showAlert('読み込みエラー', 'データの取得に失敗しました: ' + error.message);
    });

    return () => unsubscribe();
  }, [isAuthReady, user]);

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerName.trim() || !user) return;

    try {
      const newRef = doc(collection(db, 'checklists'));
      await setDoc(newRef, {
        customerName: newCustomerName.trim(),
        phasesData: JSON.stringify(initialData),
        status: 'active',
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setNewCustomerName('');
      setSelectedId(newRef.id);
      setIsSidebarOpen(false); // Close sidebar on mobile after adding
    } catch (error) {
      console.error("Add customer error:", error);
      showAlert('エラー', '追加に失敗しました: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  const handleArchiveCustomer = async (id: string, name: string, currentStatus: string) => {
    const newStatus = currentStatus === 'archived' ? 'active' : 'archived';
    const actionName = newStatus === 'archived' ? 'アーカイブ' : '復元';
    showConfirm(`${actionName}の確認`, `「${name}」を${actionName}しますか？`, async () => {
      try {
        await updateDoc(doc(db, 'checklists', id), {
          status: newStatus,
          updatedAt: serverTimestamp()
        });
      } catch (error) {
        console.error("Archive customer error:", error);
        showAlert('エラー', `${actionName}に失敗しました: ` + (error instanceof Error ? error.message : String(error)));
      }
    });
  };

  const handleDeleteCustomer = async (id: string, name: string) => {
    showConfirm('削除の確認', `本当に「${name}」のデータを削除しますか？`, async () => {
      try {
        await deleteDoc(doc(db, 'checklists', id));
        if (selectedId === id) setSelectedId(null);
      } catch (error) {
        console.error("Delete customer error:", error);
        showAlert('エラー', '削除に失敗しました: ' + (error instanceof Error ? error.message : String(error)));
      }
    });
  };

  const updatePhases = async (id: string, newPhases: Phase[]) => {
    try {
      await updateDoc(doc(db, 'checklists', id), {
        phasesData: JSON.stringify(newPhases),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Update phases error:", error);
      showAlert('エラー', '更新に失敗しました: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  const selectedChecklist = checklists.find(c => c.id === selectedId);

  const getCategory = (checklist: any) => {
    if (checklist.status === 'archived') return '04-未成約の歴史アーカイブ';
    
    const firstIncompletePhaseIndex = checklist.phases.findIndex((p: Phase) => !p.tasks.every(t => t.completed));
    
    if (firstIncompletePhaseIndex === -1) return '03-契約済み物件';
    if (firstIncompletePhaseIndex <= 2) return '01-問合せ中案件';
    if (firstIncompletePhaseIndex === 3) return '02-申込中物件';
    return '03-契約済み物件';
  };

  const categories = ['01-問合せ中案件', '02-申込中物件', '03-契約済み物件', '04-未成約の歴史アーカイブ'];
  const groupedChecklists = categories.reduce((acc, cat) => {
    acc[cat] = checklists.filter(c => getCategory(c) === cat);
    return acc;
  }, {} as Record<string, any[]>);

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  const handleTaskDataChange = (phaseId: string, taskId: string, newData: any) => {
    if (!selectedChecklist) return;
    const newPhases = selectedChecklist.phases.map((phase: Phase) => {
      if (phase.id === phaseId) {
        return {
          ...phase,
          tasks: phase.tasks.map(task => 
            task.id === taskId ? { ...task, data: newData } : task
          )
        };
      }
      return phase;
    });
    
    updateDoc(doc(db, 'checklists', selectedChecklist.id), {
      phasesData: JSON.stringify(newPhases),
      updatedAt: serverTimestamp()
    });
  };

  const handleAddProperty = (phaseId: string, taskId: string) => {
    const phase = selectedChecklist?.phases.find((p: Phase) => p.id === phaseId);
    const task = phase?.tasks.find((t: Task) => t.id === taskId);
    if (!task) return;

    const newProperty = {
      id: Date.now().toString(),
      managementCompany: '',
      apartmentName: '',
      roomNumber: '',
      foreignerAllowed: false,
      requiredDocs: [],
      notes: '',
      monthlyRent: '',
      managementFee: '',
      securityDeposit: '',
      keyMoney: '',
      guaranteeDeposit: '',
      neighborhoodFee: '',
      parkingFee: '',
      managementCompanyTel: '',
      managementCompanyFax: '',
      isConfirmed: false
    };

    const currentData = task.data || { properties: [] };
    const newProperties = [...(currentData.properties || []), newProperty];
    
    handleTaskDataChange(phaseId, taskId, { ...currentData, properties: newProperties });
  };

  const handleUpdateProperty = (phaseId: string, taskId: string, propertyId: string, field: string, value: any) => {
    const phase = selectedChecklist?.phases.find((p: Phase) => p.id === phaseId);
    const task = phase?.tasks.find((t: Task) => t.id === taskId);
    if (!task || !task.data || !task.data.properties) return;

    const newProperties = task.data.properties.map((prop: any) => 
      prop.id === propertyId ? { ...prop, [field]: value } : prop
    );
    
    handleTaskDataChange(phaseId, taskId, { ...task.data, properties: newProperties });
  };

  const handleRemoveProperty = (phaseId: string, taskId: string, propertyId: string) => {
    if (!selectedChecklist) return;
    const phase = selectedChecklist.phases.find((p: Phase) => p.id === phaseId);
    const task = phase?.tasks.find((t: Task) => t.id === taskId);
    if (!task || !task.data || !task.data.properties) return;

    const newProperties = task.data.properties.filter((p: any) => p.id !== propertyId);
    handleTaskDataChange(phaseId, taskId, { ...task.data, properties: newProperties });
  };

  const handleAddViewing = (phaseId: string, taskId: string) => {
    if (!selectedChecklist) return;
    const phase = selectedChecklist.phases.find((p: Phase) => p.id === phaseId);
    const task = phase?.tasks.find((t: Task) => t.id === taskId);
    if (!task) return;
    const viewings = task.data?.viewings || [];
    handleTaskDataChange(phaseId, taskId, {
      ...task.data,
      viewings: [...viewings, { 
        id: Date.now().toString(), 
        viewingType: '現地案内',
        propertyName: '', 
        roomNumber: '', 
        vacancyStatus: '空室', 
        keyMethod: '管理会社で借用(要署名)',
        otherKeyMethod: '',
        autoLockPin: '',
        keyBoxPin: '',
        keyBoxLocation: '',
        customerInterest: '',
        feedbackNotes: ''
      }]
    });
  };

  const handleUpdateViewing = (phaseId: string, taskId: string, viewingId: string, field: string, value: any) => {
    if (!selectedChecklist) return;
    const phase = selectedChecklist.phases.find((p: Phase) => p.id === phaseId);
    const task = phase?.tasks.find((t: Task) => t.id === taskId);
    if (!task || !task.data || !task.data.viewings) return;

    const newViewings = task.data.viewings.map((v: any) => 
      v.id === viewingId ? { ...v, [field]: value } : v
    );
    
    handleTaskDataChange(phaseId, taskId, { ...task.data, viewings: newViewings });
  };

  const handleDeleteViewing = (phaseId: string, taskId: string, viewingId: string) => {
    if (!selectedChecklist) return;
    const phase = selectedChecklist.phases.find((p: Phase) => p.id === phaseId);
    const task = phase?.tasks.find((t: Task) => t.id === taskId);
    if (!task || !task.data || !task.data.viewings) return;

    const newViewings = task.data.viewings.filter((v: any) => v.id !== viewingId);
    handleTaskDataChange(phaseId, taskId, { ...task.data, viewings: newViewings });
  };

  const getAvailableProperties = () => {
    if (!selectedChecklist) return [];
    const props: { name: string, room: string }[] = [];
    
    const p2 = selectedChecklist.phases.find((p: Phase) => p.id === 'phase-2');
    const t2_2 = p2?.tasks.find((t: Task) => t.id === 't2-2');
    if (t2_2?.data?.properties) {
      t2_2.data.properties.forEach((p: any) => {
        if (p.propertyName) props.push({ name: p.propertyName, room: p.roomNumber || '' });
      });
    }

    const p3 = selectedChecklist.phases.find((p: Phase) => p.id === 'phase-3');
    const t3_1 = p3?.tasks.find((t: Task) => t.id === 't3-1');
    if (t3_1?.data?.viewings) {
      t3_1.data.viewings.forEach((v: any) => {
        if (v.propertyName) {
          if (!props.some(existing => existing.name === v.propertyName && existing.room === v.roomNumber)) {
            props.push({ name: v.propertyName, room: v.roomNumber || '' });
          }
        }
      });
    }
    return props;
  };

  const handleAddApplication = (phaseId: string, taskId: string) => {
    if (!selectedChecklist) return;
    const phase = selectedChecklist.phases.find((p: Phase) => p.id === phaseId);
    const task = phase?.tasks.find((t: Task) => t.id === taskId);
    if (!task) return;
    const applications = task.data?.applications || [];
    handleTaskDataChange(phaseId, taskId, {
      ...task.data,
      applications: [...applications, { 
        id: Date.now().toString(), 
        propertyName: '', 
        roomNumber: '', 
        applicationMethod: '', 
        documents: [],
        screeningStatus: '審査中',
        screeningNotes: ''
      }]
    });
  };

  const handleUpdateApplication = (phaseId: string, taskId: string, appId: string, field: string, value: any) => {
    if (!selectedChecklist) return;
    const phase = selectedChecklist.phases.find((p: Phase) => p.id === phaseId);
    const task = phase?.tasks.find((t: Task) => t.id === taskId);
    if (!task || !task.data || !task.data.applications) return;

    const newApps = task.data.applications.map((a: any) => 
      a.id === appId ? { ...a, [field]: value } : a
    );
    
    handleTaskDataChange(phaseId, taskId, { ...task.data, applications: newApps });
  };

  const handleDeleteApplication = (phaseId: string, taskId: string, appId: string) => {
    if (!selectedChecklist) return;
    const phase = selectedChecklist.phases.find((p: Phase) => p.id === phaseId);
    const task = phase?.tasks.find((t: Task) => t.id === taskId);
    if (!task || !task.data || !task.data.applications) return;

    const newApps = task.data.applications.filter((a: any) => a.id !== appId);
    handleTaskDataChange(phaseId, taskId, { ...task.data, applications: newApps });
  };

  const toggleTask = (phaseId: string, taskId: string) => {
    if (!selectedChecklist) return;
    const newPhases = selectedChecklist.phases.map((phase: Phase) => {
      if (phase.id === phaseId) {
        return {
          ...phase,
          tasks: phase.tasks.map(task => 
            task.id === taskId ? { ...task, completed: !task.completed } : task
          )
        };
      }
      return phase;
    });
    updatePhases(selectedChecklist.id, newPhases);
  };

  const handleFactorChange = (phaseId: string, factorId: string, newValue: any) => {
    if (!selectedChecklist) return;
    const newPhases = selectedChecklist.phases.map((phase: Phase) => {
      if (phase.id === phaseId && phase.factors) {
        return {
          ...phase,
          factors: phase.factors.map(f => f.id === factorId ? { ...f, value: newValue } : f)
        };
      }
      return phase;
    });
    updatePhases(selectedChecklist.id, newPhases);
  };

  const togglePhase = (phaseId: string) => {
    setExpandedPhases(prev => ({
      ...prev,
      [phaseId]: !prev[phaseId]
    }));
  };

  const resetProgress = () => {
    if (!selectedChecklist) return;
    showConfirm('リセットの確認', 'すべての進捗と設定をリセットしてもよろしいですか？', () => {
      updatePhases(selectedChecklist.id, initialData);
    });
  };

  const generateExcelWorkbook = () => {
    if (!selectedChecklist) return null;
    
    // Sheet 1: Tasks
    const taskData: any[] = [];
    selectedChecklist.phases.forEach((phase: Phase) => {
      phase.tasks.forEach(task => {
        taskData.push({
          '段階': phase.title,
          'タスク': task.title,
          '状態': task.completed ? '完了' : '未完了',
          '詳細': task.description
        });
      });
    });
    const taskSheet = XLSX.utils.json_to_sheet(taskData);
    taskSheet['!cols'] = [{ wch: 20 }, { wch: 30 }, { wch: 10 }, { wch: 60 }];
    
    // Sheet 2: Factors
    const factorData: any[] = [];
    selectedChecklist.phases.forEach((phase: Phase) => {
      if (phase.factors) {
        phase.factors.forEach(factor => {
          let valStr = factor.value;
          if (Array.isArray(factor.value)) valStr = factor.value.join(', ');
          factorData.push({
            '段階': phase.title,
            '設定項目': factor.title,
            '選択・入力内容': valStr || ''
          });
        });
      }
    });
    const factorSheet = XLSX.utils.json_to_sheet(factorData);
    factorSheet['!cols'] = [{ wch: 20 }, { wch: 30 }, { wch: 40 }];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, taskSheet, "進捗状況");
    if (factorData.length > 0) {
      XLSX.utils.book_append_sheet(workbook, factorSheet, "案件詳細");
    }
    
    return workbook;
  };

  const downloadExcel = () => {
    const workbook = generateExcelWorkbook();
    if (!workbook || !selectedChecklist) return;
    const fileName = `${selectedChecklist.customerName}様_賃貸契約進捗.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  const downloadHearingSheet = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selectedChecklist) return;
    
    const phase1 = selectedChecklist.phases.find((p: Phase) => p.id === 'phase-1');
    if (!phase1 || !phase1.factors) return;

    const data: any[] = [];
    phase1.factors.forEach((factor: Factor) => {
      let valStr = factor.value;
      if (Array.isArray(factor.value)) valStr = factor.value.join('、 ');
      data.push({
        '項目': factor.title,
        '内容': valStr || ''
      });
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    worksheet['!cols'] = [{ wch: 30 }, { wch: 60 }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "ヒアリングシート");
    
    const fileName = `${selectedChecklist.customerName}様_ヒアリングシート.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  const uploadToDropbox = async () => {
    if (!selectedChecklist) return;
    
    showPrompt('Dropbox連携', 'Dropboxのアクセストークンを入力してください:\n(※初回のみ。開発者コンソールで取得したトークン)', async (token) => {
      if (!token) return;

      setIsUploading(true);
      const workbook = generateExcelWorkbook();
      if (!workbook) {
        setIsUploading(false);
        return;
      }
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const fileName = `${selectedChecklist.customerName}様_賃貸契約進捗.xlsx`;
      
      try {
        const response = await fetch('https://content.dropboxapi.com/2/files/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Dropbox-API-Arg': JSON.stringify({
              path: `/${fileName}`,
              mode: 'overwrite',
              autorename: true,
              mute: false
            }),
            'Content-Type': 'application/octet-stream'
          },
          body: excelBuffer
        });

        if (response.ok) {
          showAlert('成功', `✅ Dropboxへの保存が成功しました！\nファイル名: ${fileName}`);
        } else {
          const err = await response.text();
          showAlert('エラー', `❌ エラーが発生しました:\n${err}`);
        }
      } catch (error) {
        showAlert('エラー', `❌ ネットワークエラー:\n${error}`);
      } finally {
        setIsUploading(false);
      }
    });
  };

  if (!isAuthReady) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50">読み込み中...</div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-luxury-paper px-4 font-serif">
        <div className="max-w-md w-full bg-white/50 backdrop-blur-sm rounded-none border border-luxury-border p-12 text-center shadow-2xl">
          <div className="w-20 h-20 bg-prestige-gold/10 text-prestige-gold rounded-full flex items-center justify-center mx-auto mb-8">
            <Users className="w-10 h-10" />
          </div>
          <h1 className="text-3xl font-medium tracking-widest text-luxury-ink mb-3 uppercase font-display">AMBITIOUS CRM</h1>
          <p className="text-luxury-sage font-medium italic mb-10">賃貸業務管理システム</p>
          <button
            onClick={signInWithGoogle}
            className="w-full flex items-center justify-center space-x-3 bg-luxury-ink hover:bg-prestige-gold text-white px-6 py-4 rounded-none font-display text-sm tracking-widest uppercase transition-all duration-500 group"
          >
            <LogIn className="w-5 h-5 group-hover:rotate-12 transition-transform" />
            <span>Googleでログイン</span>
          </button>
        </div>
      </div>
    );
  }

  const totalTasks = selectedChecklist ? selectedChecklist.phases.reduce((acc: number, phase: Phase) => acc + phase.tasks.length, 0) : 0;
  const completedTasks = selectedChecklist ? selectedChecklist.phases.reduce((acc: number, phase: Phase) => 
    acc + phase.tasks.filter(t => t.completed).length, 0
  ) : 0;
  const progressPercentage = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  return (
    <div className="min-h-screen bg-luxury-paper text-luxury-ink font-sans flex overflow-hidden">
      {/* Modal Overlay */}
      <AnimatePresence>
        {modalConfig.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-luxury-ink/60 backdrop-blur-md p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 10 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="bg-white/95 border border-prestige-gold max-w-lg w-full overflow-hidden shadow-2xl"
            >
              <div className="p-10 text-center">
                <h3 className="text-xl font-display font-bold tracking-widest text-luxury-ink mb-4 uppercase">{modalConfig.title}</h3>
                <p className="text-base font-serif italic text-luxury-sage mb-10 whitespace-pre-wrap leading-relaxed">{modalConfig.message}</p>
                
                {modalConfig.type === 'prompt' && (
                  <div className="mb-10 px-8">
                    <CompositionInput 
                      type="password" 
                      autoFocus
                      value={modalConfig.inputValue}
                      onChange={(val) => setModalConfig(prev => ({ ...prev, inputValue: val }))}
                      className="w-full bg-transparent border-b border-luxury-border px-0 py-3 text-center text-sm tracking-[0.3em] font-display focus:border-prestige-gold transition-all outline-none"
                      placeholder="トークンを入力してください..."
                    />
                  </div>
                )}

                <div className="flex flex-col sm:flex-row justify-center gap-4 sm:gap-6">
                  {modalConfig.type !== 'alert' && (
                    <button 
                      onClick={modalConfig.onCancel}
                      className="px-8 py-3 text-xs font-display font-bold tracking-[0.2em] text-luxury-sage hover:text-luxury-ink uppercase transition-colors"
                    >
                      キャンセル
                    </button>
                  )}
                  <button 
                    onClick={() => modalConfig.onConfirm?.(modalConfig.inputValue)}
                    className="px-12 py-3 bg-luxury-ink text-white text-xs font-display font-bold tracking-[0.2em] uppercase hover:bg-prestige-gold transition-all duration-500 shadow-xl"
                  >
                    確認
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-30 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-72 bg-white border-r border-luxury-border flex flex-col h-screen transform transition-all duration-500 ease-in-out md:relative ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} ${isDesktopSidebarOpen ? 'md:translate-x-0 md:w-72' : 'md:-translate-x-full md:w-0 md:border-none overflow-hidden'}`}>
        <div className="p-6 border-b border-luxury-border">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-3">
              <div className="bg-luxury-ink p-2 rounded-sm text-prestige-gold">
                <ClipboardList className="w-6 h-6" />
              </div>
              <h1 className="font-display font-semibold tracking-wider text-luxury-ink uppercase text-sm">Ambitious CRM</h1>
            </div>
            <button 
              className="md:hidden p-1 text-luxury-sage hover:bg-luxury-paper rounded"
              onClick={() => setIsSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <form onSubmit={handleAddCustomer} className="flex relative">
            <CompositionInput
              type="text"
              value={newCustomerName}
              onChange={(val) => setNewCustomerName(val)}
              placeholder="新規案件を追加"
              className="w-full pl-0 pr-10 py-2 text-sm border-b border-luxury-border focus:border-prestige-gold bg-transparent focus:outline-none placeholder:italic placeholder:text-luxury-sage/40 transition-all"
            />
            <button
              type="submit"
              disabled={!newCustomerName.trim()}
              className="absolute right-0 top-1/2 -translate-y-1/2 p-2 text-luxury-sage hover:text-prestige-gold disabled:opacity-30 transition-colors"
            >
              <Plus className="w-5 h-5" />
            </button>
          </form>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {categories.map(category => {
            const items = groupedChecklists[category] || [];
            
            return (
              <div key={category} className="space-y-2">
                <button 
                  onClick={() => toggleCategory(category)}
                  className="w-full flex items-center justify-between px-2 py-1 text-[10px] font-display font-medium tracking-[0.2em] text-prestige-gold uppercase hover:opacity-80 transition-opacity"
                >
                  <div className="flex items-center space-x-2">
                    <Folder className="w-3 h-3" />
                    <span>{category.slice(3)}</span>
                  </div>
                  {expandedCategories[category] ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
                
                <AnimatePresence initial={false}>
                  {expandedCategories[category] && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden space-y-1"
                    >
                      {items.map(checklist => (
                        <div
                          key={checklist.id}
                          className={`group flex items-center justify-between px-3 py-2.5 rounded-none cursor-pointer transition-all duration-300 ml-2 border-l-2 ${
                            selectedId === checklist.id 
                              ? 'bg-luxury-paper border-prestige-gold text-luxury-ink shadow-sm' 
                              : 'border-transparent hover:border-luxury-border text-luxury-sage hover:text-luxury-ink'
                          }`}
                          onClick={() => {
                            setSelectedId(checklist.id);
                            setIsSidebarOpen(false);
                          }}
                        >
                          <div className="flex items-center space-x-3 truncate">
                            <span className="text-xs font-medium tracking-wide truncate uppercase font-display">{checklist.customerName} 様</span>
                          </div>
                          <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity space-x-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleArchiveCustomer(checklist.id, checklist.customerName, checklist.status);
                              }}
                              className="p-1 text-luxury-sage hover:text-prestige-gold"
                            >
                              <Archive className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteCustomer(checklist.id, checklist.customerName);
                              }}
                              className="p-1 text-luxury-sage hover:text-red-500"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                      {items.length === 0 && (
                        <div className="px-5 py-2 text-xs font-display text-luxury-sage/40 italic uppercase tracking-widest">
                          記録なし
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        <div className="p-6 border-t border-luxury-border bg-white/50 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 truncate">
              <div className="relative">
                <img src={user.photoURL || ''} alt="" className="w-10 h-10 rounded-none border border-luxury-border grayscale hover:grayscale-0 transition-all duration-500" />
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-prestige-gold border-2 border-white rounded-full" />
              </div>
              <div className="flex flex-col truncate">
                <span className="text-xs font-display font-semibold tracking-wider text-luxury-ink truncate uppercase">{user.displayName}</span>
                <span className="text-xs font-display text-luxury-sage tracking-widest uppercase">担当コンサルタント</span>
              </div>
            </div>
            <button
              onClick={logOut}
              className="p-2 text-luxury-sage hover:text-luxury-ink hover:bg-luxury-paper transition-all duration-300"
              title="ログアウト"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto relative">
        {selectedChecklist ? (
          <>
            <header className="bg-white/80 backdrop-blur-md border-b border-luxury-border sticky top-0 z-20 px-8 py-8 sm:py-10">
              <div className="flex flex-col gap-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6 min-w-0">
                    <button 
                      onClick={() => setIsSidebarOpen(true)}
                      className="md:hidden p-2 -ml-2 text-luxury-sage hover:bg-luxury-paper rounded-none"
                    >
                      <Menu className="w-6 h-6" />
                    </button>
                    <button 
                      onClick={() => setIsDesktopSidebarOpen(!isDesktopSidebarOpen)}
                      className="hidden md:block p-2 -ml-2 text-luxury-sage hover:bg-luxury-paper rounded-none"
                    >
                      <Menu className="w-6 h-6" />
                    </button>
                    <div className="min-w-0">
                      <h2 className="text-2xl sm:text-4xl font-normal font-serif text-luxury-ink tracking-tight truncate">{selectedChecklist.customerName} 様</h2>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="w-2 h-2 bg-prestige-gold rounded-full" />
                        <p className="text-xs font-display font-bold tracking-[0.2em] text-luxury-sage uppercase">同期済み</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3 flex-shrink-0">
                    <button 
                      onClick={downloadExcel}
                      className="flex items-center justify-center text-xs font-display font-medium tracking-widest uppercase bg-transparent border border-luxury-border text-luxury-ink hover:bg-luxury-ink hover:text-white transition-all duration-500 px-4 py-2"
                      title="Excelとしてダウンロード"
                    >
                      <FileSpreadsheet className="w-4 h-4 mr-2" />
                      <span className="hidden sm:inline">Excel出力</span>
                    </button>
                    
                    <button 
                      onClick={uploadToDropbox}
                      disabled={isUploading}
                      className="flex items-center justify-center text-xs font-display font-medium tracking-widest uppercase bg-prestige-gold/10 border border-prestige-gold/20 text-prestige-gold hover:bg-prestige-gold hover:text-white transition-all duration-500 px-4 py-2 disabled:opacity-30"
                      title="Dropboxへ直接保存"
                    >
                      <CloudUpload className="w-4 h-4 mr-2" />
                      <span className="hidden sm:inline">{isUploading ? '処理中...' : 'Dropbox保存'}</span>
                    </button>

                    <button 
                      onClick={resetProgress}
                      className="p-2 text-luxury-sage hover:text-red-600 transition-colors"
                      title="進捗リセット"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="px-2 sm:px-12">
                  <div className="relative flex justify-between items-center w-full max-w-[1400px] mx-auto">
                    {/* Background Line */}
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-[1px] bg-luxury-border" />
                    {/* Active Line */}
                    <div 
                      className="absolute left-0 top-1/2 -translate-y-1/2 h-[1px] bg-prestige-gold transition-all duration-1000 ease-in-out" 
                      style={{ width: `${Math.min(100, (selectedChecklist.phases.filter((p: Phase) => p.tasks.length > 0 && p.tasks.every(t => t.completed)).length / (selectedChecklist.phases.length - 1)) * 100)}%` }} 
                    />
                    
                    {/* Points */}
                    {selectedChecklist.phases.map((phase: Phase, index: number) => {
                      const isComplete = phase.tasks.length > 0 && phase.tasks.every(t => t.completed);
                      const isCurrent = !isComplete && (index === 0 || selectedChecklist.phases[index - 1].tasks.every((t: Task) => t.completed));
                      
                      return (
                        <div 
                          key={phase.id} 
                          className="relative z-10 flex flex-col items-center cursor-pointer group"
                          onClick={() => {
                            const el = document.getElementById(phase.id);
                            if (el) {
                              el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                              if (!expandedPhases[phase.id]) {
                                togglePhase(phase.id);
                              }
                            }
                          }}
                        >
                          <div className={`w-8 h-8 sm:w-12 sm:h-12 rounded-full flex items-center justify-center border transition-all duration-500 group-hover:scale-110 ${
                            isComplete 
                              ? 'bg-prestige-gold border-prestige-gold text-white shadow-lg shadow-prestige-gold/20' 
                              : isCurrent 
                                ? 'bg-luxury-ink border-luxury-ink text-white shadow-xl shadow-luxury-ink/30' 
                                : 'bg-white border-luxury-border text-luxury-sage'
                          }`}>
                            {isComplete ? <CheckCircle2 className="w-4 h-4 sm:w-6 sm:h-6" /> : <span className="text-xs sm:text-sm font-display font-bold leading-none">{index + 1}</span>}
                          </div>
                          <span className={`hidden md:block absolute top-14 text-[10px] sm:text-[11px] font-display font-medium tracking-[0.2em] whitespace-nowrap uppercase transition-colors duration-500 ${isComplete ? 'text-prestige-gold' : isCurrent ? 'text-luxury-ink' : 'text-luxury-sage/60'}`}>
                            {phase.title.split('.')[1]?.trim() || phase.title}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </header>

            <div className="p-8 sm:p-12 max-w-[1400px] mx-auto w-full space-y-8 sm:space-y-12">
              {selectedChecklist.phases.map((phase: Phase) => {
                const phaseCompletedTasks = phase.tasks.filter(t => t.completed).length;
                const phaseTotalTasks = phase.tasks.length;
                const isPhaseComplete = phaseCompletedTasks === phaseTotalTasks;
                const isExpanded = expandedPhases[phase.id];

                return (
                   <div 
                    key={phase.id} 
                    id={phase.id}
                    className={`bg-white/40 backdrop-blur-sm rounded-none border transition-all duration-700 scroll-mt-32 ${
                      isPhaseComplete ? 'border-prestige-gold/30 bg-prestige-gold/[0.02]' : 'border-luxury-border'
                    }`}
                  >
                    <button 
                      onClick={() => togglePhase(phase.id)}
                      className="w-full px-6 py-5 sm:px-8 sm:py-6 flex items-center justify-between hover:bg-luxury-paper/50 transition-colors text-left group"
                    >
                      <div className="flex items-center space-x-5 flex-1 min-w-0">
                        <div className={`p-3 rounded-none flex-shrink-0 transition-colors duration-500 ${isPhaseComplete ? 'bg-prestige-gold text-white' : 'bg-luxury-ink text-prestige-gold'}`}>
                          {renderIcon(phase.iconName)}
                        </div>
                        <div className="flex-1 min-w-0 pr-4">
                          <h2 className="text-lg sm:text-xl font-normal font-serif text-luxury-ink tracking-tight truncate group-hover:text-prestige-gold transition-colors uppercase">{phase.title}</h2>
                          <div className="mt-3 flex items-center gap-4">
                            <div className="flex-1 bg-luxury-border rounded-none h-[1px] overflow-hidden">
                              <div 
                                className={`h-full transition-all duration-1000 ${isPhaseComplete ? 'bg-prestige-gold' : 'bg-luxury-sage'}`} 
                                style={{ width: `${phaseTotalTasks > 0 ? (phaseCompletedTasks / phaseTotalTasks) * 100 : 0}%` }} 
                              />
                            </div>
                            <span className="text-xs font-display font-black tracking-widest text-luxury-sage uppercase whitespace-nowrap">
                              {phaseCompletedTasks} / {phaseTotalTasks}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-6">
                        {isPhaseComplete && (
                          <span className="text-xs font-display font-black tracking-widest bg-prestige-gold text-white px-3 py-1.5 uppercase shadow-sm">
                            完了
                          </span>
                        )}
                        <div className="text-luxury-sage transition-transform duration-500" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                          <ChevronDown className="w-6 h-6" />
                        </div>
                      </div>
                    </button>

                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: "easeInOut" }}
                          className="overflow-hidden"
                        >
                          <div className="border-t border-slate-100 px-3 py-3 sm:px-4 sm:py-4 bg-slate-50/50">
                            
                            {/* Tasks Section */}
                            <div className="mb-10 sm:mb-16">
                              <h4 className="text-xs sm:text-sm font-display font-black tracking-[0.3em] text-prestige-gold mb-6 flex items-center uppercase">
                                <CheckSquare className="w-4 h-4 mr-3"/>
                                基本タスク
                              </h4>
                              <div className="bg-white/50 border border-luxury-border shadow-sm overflow-hidden">
                                {phase.tasks.map((task, index) => (
                                  <div 
                                    key={task.id}
                                    onClick={() => toggleTask(phase.id, task.id)}
                                    className={`group flex items-start space-x-6 p-6 sm:p-8 cursor-pointer transition-all duration-300 ${
                                      index !== phase.tasks.length - 1 ? 'border-b border-luxury-border' : ''
                                    } ${
                                      task.completed 
                                        ? 'bg-luxury-paper/30' 
                                        : 'hover:bg-white transition-colors'
                                    }`}
                                  >
                                    <div className="flex-shrink-0 mt-1">
                                      {task.completed ? (
                                        <motion.div
                                          initial={{ scale: 0.8, opacity: 0 }}
                                          animate={{ scale: 1, opacity: 1 }}
                                          transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                        >
                                          <CheckCircle2 className="w-6 h-6 text-prestige-gold" />
                                        </motion.div>
                                      ) : (
                                        <div className="w-6 h-6 border border-luxury-border group-hover:border-prestige-gold transition-colors flex items-center justify-center">
                                          <div className="w-1.5 h-1.5 bg-prestige-gold scale-0 group-hover:scale-100 transition-transform duration-500" />
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <h5 className={`text-base sm:text-xl font-serif tracking-tight mb-2 transition-all duration-500 ${task.completed ? 'text-luxury-sage/40 font-medium italic' : 'text-luxury-ink font-normal'}`}>
                                        {task.title}
                                      </h5>
                                      {task.id === 't2-2' ? (
                                        <div className="mt-3 space-y-4" onClick={e => e.stopPropagation()}>
                                          {task.data?.properties?.map((property: any, index: number) => {
                                            const isArchived = property.isConfirmed;
                                            return (
                                              <div key={property.id} className={`bg-white border rounded-lg shadow-sm relative group transition-all duration-500 ${isArchived ? 'border-slate-100 bg-slate-50/50 grayscale-[0.5]' : 'border-slate-200'}`}>
                                                <button 
                                                  onClick={() => handleRemoveProperty(phase.id, task.id, property.id)}
                                                  className="absolute top-2 right-2 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                                >
                                                  <X className="w-4 h-4" />
                                                </button>
                                                
                                                {isArchived && (
                                                  <div className="absolute top-4 right-10 flex items-center space-x-1 px-3 py-1 bg-prestige-gold/10 border border-prestige-gold/20 text-prestige-gold">
                                                    <Archive className="w-3.5 h-3.5" />
                                                    <span className="text-[10px] font-display font-bold tracking-widest uppercase">Archived</span>
                                                  </div>
                                                )}

                                                <div className={`p-6 space-y-6 ${isArchived ? 'pointer-events-none' : ''}`}>
                                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                    <div>
                                                      <label className="block text-[10px] font-display font-bold text-luxury-sage tracking-widest uppercase mb-1">管理会社名</label>
                                                      <CompositionInput 
                                                        type="text" 
                                                        className="w-full text-sm px-0 py-2 border-b border-luxury-border focus:border-prestige-gold bg-transparent outline-none transition-all placeholder:italic"
                                                        placeholder="例: 〇〇不動産"
                                                        value={property.managementCompany || ''}
                                                        onChange={(val) => handleUpdateProperty(phase.id, task.id, property.id, 'managementCompany', val)}
                                                        disabled={isArchived}
                                                      />
                                                    </div>
                                                    <div>
                                                      <label className="block text-[10px] font-display font-bold text-luxury-sage tracking-widest uppercase mb-1">物件名</label>
                                                      <CompositionInput 
                                                        type="text" 
                                                        className="w-full text-sm px-0 py-2 border-b border-luxury-border focus:border-prestige-gold bg-transparent outline-none transition-all placeholder:italic"
                                                        placeholder="例: メゾン〇〇"
                                                        value={property.apartmentName || ''}
                                                        onChange={(val) => handleUpdateProperty(phase.id, task.id, property.id, 'apartmentName', val)}
                                                        disabled={isArchived}
                                                      />
                                                    </div>
                                                    <div>
                                                      <label className="block text-[10px] font-display font-bold text-luxury-sage tracking-widest uppercase mb-1">号室</label>
                                                      <CompositionInput 
                                                        type="text" 
                                                        className="w-full text-sm px-0 py-2 border-b border-luxury-border focus:border-prestige-gold bg-transparent outline-none transition-all placeholder:italic"
                                                        placeholder="例: 201"
                                                        value={property.roomNumber || ''}
                                                        onChange={(val) => handleUpdateProperty(phase.id, task.id, property.id, 'roomNumber', val)}
                                                        disabled={isArchived}
                                                      />
                                                    </div>
                                                  </div>

                                                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                                                    <div>
                                                      <label className="block text-[10px] font-display font-bold text-luxury-sage tracking-widest uppercase mb-1">月額賃料</label>
                                                      <CompositionInput 
                                                        type="text" 
                                                        className="w-full text-sm px-0 py-2 border-b border-luxury-border focus:border-prestige-gold bg-transparent outline-none"
                                                        placeholder="6.5万円"
                                                        value={property.monthlyRent || ''}
                                                        onChange={(val) => handleUpdateProperty(phase.id, task.id, property.id, 'monthlyRent', val)}
                                                        disabled={isArchived}
                                                      />
                                                    </div>
                                                    <div>
                                                      <label className="block text-[10px] font-display font-bold text-luxury-sage tracking-widest uppercase mb-1">共益費・管理費</label>
                                                      <CompositionInput 
                                                        type="text" 
                                                        className="w-full text-sm px-0 py-2 border-b border-luxury-border focus:border-prestige-gold bg-transparent outline-none"
                                                        placeholder="5,000円"
                                                        value={property.managementFee || ''}
                                                        onChange={(val) => handleUpdateProperty(phase.id, task.id, property.id, 'managementFee', val)}
                                                        disabled={isArchived}
                                                      />
                                                    </div>
                                                    <div>
                                                      <label className="block text-[10px] font-display font-bold text-luxury-sage tracking-widest uppercase mb-1">敷金</label>
                                                      <CompositionInput 
                                                        type="text" 
                                                        className="w-full text-sm px-0 py-2 border-b border-luxury-border focus:border-prestige-gold bg-transparent outline-none"
                                                        placeholder="1ヶ月"
                                                        value={property.securityDeposit || ''}
                                                        onChange={(val) => handleUpdateProperty(phase.id, task.id, property.id, 'securityDeposit', val)}
                                                        disabled={isArchived}
                                                      />
                                                    </div>
                                                    <div>
                                                      <label className="block text-[10px] font-display font-bold text-luxury-sage tracking-widest uppercase mb-1">礼金</label>
                                                      <CompositionInput 
                                                        type="text" 
                                                        className="w-full text-sm px-0 py-2 border-b border-luxury-border focus:border-prestige-gold bg-transparent outline-none"
                                                        placeholder="なし"
                                                        value={property.keyMoney || ''}
                                                        onChange={(val) => handleUpdateProperty(phase.id, task.id, property.id, 'keyMoney', val)}
                                                        disabled={isArchived}
                                                      />
                                                    </div>
                                                    <div>
                                                      <label className="block text-[10px] font-display font-bold text-luxury-sage tracking-widest uppercase mb-1">保証金</label>
                                                      <CompositionInput 
                                                        type="text" 
                                                        className="w-full text-sm px-0 py-2 border-b border-luxury-border focus:border-prestige-gold bg-transparent outline-none"
                                                        placeholder="なし"
                                                        value={property.guaranteeDeposit || ''}
                                                        onChange={(val) => handleUpdateProperty(phase.id, task.id, property.id, 'guaranteeDeposit', val)}
                                                        disabled={isArchived}
                                                      />
                                                    </div>
                                                  </div>

                                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                                    <div>
                                                      <label className="block text-[10px] font-display font-bold text-luxury-sage tracking-widest uppercase mb-1">町内会費</label>
                                                      <CompositionInput 
                                                        type="text" 
                                                        className="w-full text-sm px-0 py-2 border-b border-luxury-border focus:border-prestige-gold bg-transparent outline-none"
                                                        placeholder="300円"
                                                        value={property.neighborhoodFee || ''}
                                                        onChange={(val) => handleUpdateProperty(phase.id, task.id, property.id, 'neighborhoodFee', val)}
                                                        disabled={isArchived}
                                                      />
                                                    </div>
                                                    <div>
                                                      <label className="block text-[10px] font-display font-bold text-luxury-sage tracking-widest uppercase mb-1">駐車場使用料</label>
                                                      <CompositionInput 
                                                        type="text" 
                                                        className="w-full text-sm px-0 py-2 border-b border-luxury-border focus:border-prestige-gold bg-transparent outline-none"
                                                        placeholder="8,800円"
                                                        value={property.parkingFee || ''}
                                                        onChange={(val) => handleUpdateProperty(phase.id, task.id, property.id, 'parkingFee', val)}
                                                        disabled={isArchived}
                                                      />
                                                    </div>
                                                    <div>
                                                      <label className="block text-[10px] font-display font-bold text-luxury-sage tracking-widest uppercase mb-1">管理会社TEL</label>
                                                      <CompositionInput 
                                                        type="text" 
                                                        className="w-full text-sm px-0 py-2 border-b border-luxury-border focus:border-prestige-gold bg-transparent outline-none"
                                                        placeholder="03-0000-0000"
                                                        value={property.managementCompanyTel || ''}
                                                        onChange={(val) => handleUpdateProperty(phase.id, task.id, property.id, 'managementCompanyTel', val)}
                                                        disabled={isArchived}
                                                      />
                                                    </div>
                                                    <div>
                                                      <label className="block text-[10px] font-display font-bold text-luxury-sage tracking-widest uppercase mb-1">管理会社FAX</label>
                                                      <CompositionInput 
                                                        type="text" 
                                                        className="w-full text-sm px-0 py-2 border-b border-luxury-border focus:border-prestige-gold bg-transparent outline-none"
                                                        placeholder="03-0000-0000"
                                                        value={property.managementCompanyFax || ''}
                                                        onChange={(val) => handleUpdateProperty(phase.id, task.id, property.id, 'managementCompanyFax', val)}
                                                        disabled={isArchived}
                                                      />
                                                    </div>
                                                  </div>

                                                  <div className="bg-slate-50/50 p-4 border border-slate-100 flex flex-col space-y-4">
                                                    <p className="text-[10px] font-display font-bold text-luxury-sage tracking-widest uppercase">必要書類・条件</p>
                                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                                      {[
                                                        { id: 'foreignerAllowed', label: '外国人入居可' },
                                                        { id: 'zairyu', label: '在留カード', isDoc: true },
                                                        { id: 'emergency', label: '日本国籍の緊急連絡先', isDoc: true },
                                                        { id: 'guarantor', label: '連帯保証人', isDoc: true }
                                                      ].map(item => {
                                                        const isChecked = item.isDoc 
                                                          ? property.requiredDocs?.includes(item.label) 
                                                          : property.foreignerAllowed;
                                                        return (
                                                          <label key={item.id} className={`flex items-center space-x-2 p-2 rounded transition-colors group/label ${isArchived ? 'opacity-50' : 'cursor-pointer hover:bg-white'}`}>
                                                            <div className={`w-4 h-4 border flex items-center justify-center transition-colors ${isChecked ? 'bg-luxury-ink border-luxury-ink' : 'bg-white border-luxury-border group-hover/label:border-prestige-gold'}`}>
                                                              {isChecked && <CheckSquare className="w-3 h-3 text-white" />}
                                                            </div>
                                                            <input 
                                                              type="checkbox" 
                                                              className="hidden" 
                                                              checked={isChecked}
                                                              disabled={isArchived}
                                                              onChange={(e) => {
                                                                if (item.isDoc) {
                                                                  const currentDocs = property.requiredDocs || [];
                                                                  const newDocs = e.target.checked 
                                                                    ? [...currentDocs, item.label] 
                                                                    : currentDocs.filter((d: string) => d !== item.label);
                                                                  handleUpdateProperty(phase.id, task.id, property.id, 'requiredDocs', newDocs);
                                                                } else {
                                                                  handleUpdateProperty(phase.id, task.id, property.id, item.id, e.target.checked);
                                                                }
                                                              }}
                                                            />
                                                            <span className="text-xs font-display font-medium tracking-wider text-luxury-sage uppercase">{item.label}</span>
                                                          </label>
                                                        );
                                                      })}
                                                    </div>
                                                  </div>

                                                  <div className="space-y-2">
                                                    <label className="block text-[10px] font-display font-bold text-luxury-sage tracking-widest uppercase">その他の確認事項（空室状況、内見方法など）</label>
                                                    <CompositionTextarea 
                                                      className="w-full text-sm px-4 py-3 border border-luxury-border focus:border-prestige-gold bg-transparent outline-none transition-all resize-y min-h-[80px]"
                                                      placeholder="詳細をご記入ください..."
                                                      value={property.notes || ''}
                                                      onChange={(val) => handleUpdateProperty(phase.id, task.id, property.id, 'notes', val)}
                                                      disabled={isArchived}
                                                    />
                                                  </div>

                                                  {!isArchived && (
                                                    <div className="pt-4 border-t border-slate-100 flex justify-end">
                                                      <button 
                                                        onClick={() => handleUpdateProperty(phase.id, task.id, property.id, 'isConfirmed', true)}
                                                        className="px-8 py-2.5 bg-luxury-ink text-white font-display font-bold text-xs tracking-[0.2em] uppercase hover:bg-prestige-gold transition-all duration-500 shadow-lg shadow-luxury-ink/20"
                                                      >
                                                        確定してアーカイブ
                                                      </button>
                                                    </div>
                                                  )}
                                                </div>
                                              </div>
                                            );
                                          })}
                                          
                                          <button 
                                            onClick={() => handleAddProperty(phase.id, task.id)}
                                            className="w-full py-6 border-2 border-dashed border-luxury-border text-luxury-sage rounded-none hover:border-prestige-gold hover:text-luxury-ink transition-all duration-500 flex items-center justify-center space-x-3 group"
                                          >
                                            <Plus className="w-5 h-5 group-hover:scale-110 transition-transform duration-500" />
                                            <span className="text-sm font-display font-bold tracking-[0.2em] uppercase">物件情報を追加</span>
                                          </button>
                                        </div>
                                      ) : task.id === 't3-1' ? (
                                        <div className="mt-3 space-y-4" onClick={e => e.stopPropagation()}>
                                          <p className="text-sm text-slate-500 mb-2">{task.description}</p>
                                          {task.data?.viewings?.map((viewing: any) => (
                                            <div key={viewing.id} className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm relative group">
                                              <button 
                                                onClick={() => handleDeleteViewing(phase.id, task.id, viewing.id)}
                                                className="absolute top-2 right-2 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                              >
                                                <X className="w-4 h-4" />
                                              </button>
                                              
                                              <div className="mb-4 bg-slate-50 p-3 rounded-md border border-slate-200">
                                                <label className="block text-xs font-bold text-slate-700 mb-2">案内方法</label>
                                                <div className="flex space-x-6">
                                                  <label className="flex items-center space-x-2 cursor-pointer">
                                                    <input 
                                                      type="radio" 
                                                      name={`viewingType-${viewing.id}`} 
                                                      value="現地案内" 
                                                      checked={viewing.viewingType !== 'オンライン案内'} 
                                                      onChange={() => handleUpdateViewing(phase.id, task.id, viewing.id, 'viewingType', '現地案内')} 
                                                      className="text-blue-600 focus:ring-blue-500 w-4 h-4" 
                                                    />
                                                    <span className="text-sm text-slate-700 font-medium">現地案内</span>
                                                  </label>
                                                  <label className="flex items-center space-x-2 cursor-pointer">
                                                    <input 
                                                      type="radio" 
                                                      name={`viewingType-${viewing.id}`} 
                                                      value="オンライン案内" 
                                                      checked={viewing.viewingType === 'オンライン案内'} 
                                                      onChange={() => handleUpdateViewing(phase.id, task.id, viewing.id, 'viewingType', 'オンライン案内')} 
                                                      className="text-blue-600 focus:ring-blue-500 w-4 h-4" 
                                                    />
                                                    <span className="text-sm text-slate-700 font-medium">オンライン案内</span>
                                                  </label>
                                                </div>
                                              </div>

                                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                                                <div className="sm:col-span-2">
                                                  <label className="block text-xs font-medium text-slate-500 mb-1">物件選択</label>
                                                  <select
                                                    className="w-full text-sm px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none transition-shadow bg-white"
                                                    value={`${viewing.propertyName || ''}|${viewing.roomNumber || ''}`}
                                                    onChange={(e) => {
                                                      const [name, room] = e.target.value.split('|');
                                                      handleUpdateViewing(phase.id, task.id, viewing.id, 'propertyName', name);
                                                      handleUpdateViewing(phase.id, task.id, viewing.id, 'roomNumber', room);
                                                    }}
                                                  >
                                                    <option value="|">物件を選択してください</option>
                                                    {selectedChecklist?.phases.find((p: Phase) => p.id === 'phase-2')?.tasks.find((t: Task) => t.id === 't2-2')?.data?.properties?.map((prop: any) => (
                                                      <option key={prop.id} value={`${prop.apartmentName}|${prop.roomNumber}`}>
                                                        {prop.apartmentName} {prop.roomNumber}
                                                      </option>
                                                    ))}
                                                  </select>
                                                </div>
                                                <div>
                                                  <label className="block text-xs font-medium text-slate-500 mb-1">物件名（自動入力）</label>
                                                  <div className="w-full text-sm px-3 py-2 border border-slate-100 bg-slate-50 text-slate-500 rounded-md">
                                                    {viewing.propertyName || '未選択'}
                                                  </div>
                                                </div>
                                                <div>
                                                  <label className="block text-xs font-medium text-slate-500 mb-1">号室（自動入力）</label>
                                                  <div className="w-full text-sm px-3 py-2 border border-slate-100 bg-slate-50 text-slate-500 rounded-md">
                                                    {viewing.roomNumber || '未選択'}
                                                  </div>
                                                </div>
                                              </div>

                                              <div className="bg-slate-50 p-3 rounded-md border border-slate-200 space-y-3 mb-3">
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                  <div>
                                                    <label className="block text-xs font-medium text-slate-500 mb-1">空室状況</label>
                                                    <select
                                                      className="w-full text-sm px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none transition-shadow bg-white"
                                                      value={viewing.vacancyStatus || '空室'}
                                                      onChange={(e) => handleUpdateViewing(phase.id, task.id, viewing.id, 'vacancyStatus', e.target.value)}
                                                    >
                                                      <option value="空室">空室</option>
                                                      <option value="居住中(退去予定)">居住中(退去予定)</option>
                                                    </select>
                                                  </div>
                                                  {viewing.vacancyStatus === '居住中(退去予定)' && (
                                                    <div>
                                                      <label className="block text-xs font-medium text-slate-500 mb-1">退去予定日</label>
                                                      <input 
                                                        type="date" 
                                                        className="w-full text-sm px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
                                                        value={viewing.moveOutDate || ''}
                                                        onChange={(e) => handleUpdateViewing(phase.id, task.id, viewing.id, 'moveOutDate', e.target.value)}
                                                      />
                                                    </div>
                                                  )}
                                                  <div>
                                                    <label className="block text-xs font-medium text-slate-500 mb-1">内覧可能日</label>
                                                    <input 
                                                      type="date" 
                                                      className="w-full text-sm px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
                                                      value={viewing.viewableDate || ''}
                                                      onChange={(e) => handleUpdateViewing(phase.id, task.id, viewing.id, 'viewableDate', e.target.value)}
                                                    />
                                                  </div>
                                                  <div>
                                                    <label className="block text-xs font-medium text-slate-500 mb-1">お客様との内覧日時</label>
                                                    <input 
                                                      type="datetime-local" 
                                                      className="w-full text-sm px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
                                                      value={viewing.clientViewingDateTime || ''}
                                                      onChange={(e) => handleUpdateViewing(phase.id, task.id, viewing.id, 'clientViewingDateTime', e.target.value)}
                                                    />
                                                  </div>
                                                </div>
                                              </div>

                                              <div className="bg-blue-50 p-3 rounded-md border border-blue-100 space-y-3">
                                                <p className="text-xs font-bold text-blue-800">鍵の取得方法</p>
                                                <div>
                                                  <select
                                                    className="w-full text-sm px-3 py-2 border border-blue-200 rounded-md focus:ring-2 focus:ring-blue-500 outline-none transition-shadow bg-white"
                                                    value={viewing.keyMethod || '管理会社で借用(要署名)'}
                                                    onChange={(e) => handleUpdateViewing(phase.id, task.id, viewing.id, 'keyMethod', e.target.value)}
                                                  >
                                                    <option value="管理会社で借用(要署名)">管理会社で借用(要署名)</option>
                                                    <option value="現地キーボックス">現地キーボックス</option>
                                                    <option value="その他">その他</option>
                                                  </select>
                                                </div>
                                                
                                                {viewing.keyMethod === 'その他' && (
                                                  <div className="mt-2">
                                                    <CompositionInput 
                                                      type="text" 
                                                      className="w-full text-sm px-3 py-2 border border-blue-200 rounded-md focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
                                                      placeholder="その他の取得方法を入力"
                                                      value={viewing.otherKeyMethod || ''}
                                                      onChange={(val) => handleUpdateViewing(phase.id, task.id, viewing.id, 'otherKeyMethod', val)}
                                                    />
                                                  </div>
                                                )}
                                                
                                                {viewing.keyMethod === '現地キーボックス' && (
                                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
                                                    <div>
                                                      <label className="block text-xs font-medium text-blue-700 mb-1">オートロック暗証番号</label>
                                                      <CompositionInput 
                                                        type="text" 
                                                        className="w-full text-sm px-3 py-2 border border-blue-200 rounded-md focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
                                                        placeholder="例: 1234E"
                                                        value={viewing.autoLockPin || ''}
                                                        onChange={(val) => handleUpdateViewing(phase.id, task.id, viewing.id, 'autoLockPin', val)}
                                                      />
                                                    </div>
                                                    <div>
                                                      <label className="block text-xs font-medium text-blue-700 mb-1">キーボックス暗証番号</label>
                                                      <CompositionInput 
                                                        type="text" 
                                                        className="w-full text-sm px-3 py-2 border border-blue-200 rounded-md focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
                                                        placeholder="例: 0000"
                                                        value={viewing.keyBoxPin || ''}
                                                        onChange={(val) => handleUpdateViewing(phase.id, task.id, viewing.id, 'keyBoxPin', val)}
                                                      />
                                                    </div>
                                                    <div>
                                                      <label className="block text-xs font-medium text-blue-700 mb-1">設置場所</label>
                                                      <CompositionInput 
                                                        type="text" 
                                                        className="w-full text-sm px-3 py-2 border border-blue-200 rounded-md focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
                                                        placeholder="例: 駐輪場パイプ"
                                                        value={viewing.keyBoxLocation || ''}
                                                        onChange={(val) => handleUpdateViewing(phase.id, task.id, viewing.id, 'keyBoxLocation', val)}
                                                      />
                                                    </div>
                                                  </div>
                                                )}
                                              </div>

                                              <div className="bg-amber-50 p-3 rounded-md border border-amber-100 space-y-3 mt-3">
                                                <p className="text-xs font-bold text-amber-800">内覧フィードバック</p>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                  <div>
                                                    <label className="block text-xs font-medium text-amber-700 mb-1">お客様の反応・意向</label>
                                                    <select
                                                      className="w-full text-sm px-3 py-2 border border-amber-200 rounded-md focus:ring-2 focus:ring-amber-500 outline-none transition-shadow bg-white"
                                                      value={viewing.customerInterest || ''}
                                                      onChange={(e) => handleUpdateViewing(phase.id, task.id, viewing.id, 'customerInterest', e.target.value)}
                                                    >
                                                      <option value="">選択してください</option>
                                                      <option value="申込希望">申込希望 (お気に入り)</option>
                                                      <option value="前向きに検討">前向きに検討</option>
                                                      <option value="キープ (他も見る)">キープ (他も見る)</option>
                                                      <option value="見送り (条件合わず)">見送り (条件合わず)</option>
                                                    </select>
                                                  </div>
                                                  <div className="sm:col-span-2">
                                                    <label className="block text-xs font-medium text-amber-700 mb-1">コメント・懸念点</label>
                                                    <CompositionTextarea 
                                                      className="w-full text-sm px-3 py-2 border border-amber-200 rounded-md focus:ring-2 focus:ring-amber-500 outline-none transition-shadow bg-white"
                                                      rows={2}
                                                      placeholder="例: 日当たりは良いが、収納が少し足りないと感じている"
                                                      value={viewing.feedbackNotes || ''}
                                                      onChange={(val) => handleUpdateViewing(phase.id, task.id, viewing.id, 'feedbackNotes', val)}
                                                    />
                                                  </div>
                                                </div>
                                              </div>
                                            </div>
                                          ))}
                                          
                                          <button 
                                            onClick={() => handleAddViewing(phase.id, task.id)}
                                            className="w-full py-2 border-2 border-dashed border-slate-300 text-slate-500 rounded-lg hover:border-blue-400 hover:text-blue-600 transition-colors flex items-center justify-center space-x-2 text-sm font-medium"
                                          >
                                            <Plus className="w-4 h-4" />
                                            <span>内覧物件を追加</span>
                                          </button>
                                        </div>
                                      ) : task.id === 't4-1' ? (
                                        <div className="mt-3 space-y-4" onClick={e => e.stopPropagation()}>
                                          <p className="text-sm text-slate-500 mb-2">{task.description}</p>
                                          {task.data?.applications?.map((app: any) => {
                                            const isArchived = app.screeningStatus === '審査落ち(アーカイブ)';
                                            return (
                                            <div key={app.id} className={`bg-white border rounded-lg p-4 shadow-sm relative group transition-all ${isArchived ? 'border-slate-200 bg-slate-50 opacity-75' : 'border-slate-200'}`}>
                                              <button 
                                                onClick={() => handleDeleteApplication(phase.id, task.id, app.id)}
                                                className="absolute top-2 right-2 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                              >
                                                <X className="w-4 h-4" />
                                              </button>
                                              
                                              {isArchived && (
                                                <div className="absolute top-2 right-10 bg-slate-200 text-slate-600 text-xs px-2 py-1 rounded-md font-medium">
                                                  アーカイブ済
                                                </div>
                                              )}

                                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                                                <div className="sm:col-span-2">
                                                  <label className="block text-xs font-medium text-slate-500 mb-1">物件選択 (過去の物件から自動入力)</label>
                                                  <select 
                                                    className="w-full text-sm px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none transition-shadow bg-white mb-2"
                                                    onChange={(e) => {
                                                      if (e.target.value) {
                                                        const [name, room] = e.target.value.split('|||');
                                                        handleUpdateApplication(phase.id, task.id, app.id, 'propertyName', name);
                                                        handleUpdateApplication(phase.id, task.id, app.id, 'roomNumber', room);
                                                      }
                                                    }}
                                                  >
                                                    <option value="">-- 物件を選択 --</option>
                                                    {getAvailableProperties().map((p, idx) => (
                                                      <option key={idx} value={`${p.name}|||${p.room}`}>{p.name} {p.room}</option>
                                                    ))}
                                                  </select>
                                                </div>
                                                <div>
                                                  <label className="block text-xs font-medium text-slate-500 mb-1">物件名</label>
                                                  <CompositionInput 
                                                    type="text" 
                                                    className="w-full text-sm px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
                                                    placeholder="例: メゾン〇〇"
                                                    value={app.propertyName || ''}
                                                    onChange={(val) => handleUpdateApplication(phase.id, task.id, app.id, 'propertyName', val)}
                                                  />
                                                </div>
                                                <div>
                                                  <label className="block text-xs font-medium text-slate-500 mb-1">号室</label>
                                                  <CompositionInput 
                                                    type="text" 
                                                    className="w-full text-sm px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
                                                    placeholder="例: 101"
                                                    value={app.roomNumber || ''}
                                                    onChange={(val) => handleUpdateApplication(phase.id, task.id, app.id, 'roomNumber', val)}
                                                  />
                                                </div>
                                              </div>

                                              <div className="mb-4">
                                                <label className="block text-xs font-medium text-slate-500 mb-2">申込方法</label>
                                                <div className="flex flex-wrap gap-4">
                                                  {['WEB電子申込 (ITANDI BB等)', '紙・FAX申込', '紙・郵送申込'].map(method => (
                                                    <label key={method} className="flex items-center space-x-2 cursor-pointer">
                                                      <input 
                                                        type="radio" 
                                                        name={`appMethod-${app.id}`} 
                                                        value={method} 
                                                        checked={app.applicationMethod === method} 
                                                        onChange={(e) => handleUpdateApplication(phase.id, task.id, app.id, 'applicationMethod', e.target.value)} 
                                                        className="text-blue-600 focus:ring-blue-500 w-4 h-4" 
                                                      />
                                                      <span className="text-sm text-slate-700">{method}</span>
                                                    </label>
                                                  ))}
                                                </div>
                                              </div>

                                              <div className="mb-4">
                                                <label className="block text-xs font-medium text-slate-500 mb-2">必要書類・身分証コピー取得</label>
                                                <div className="flex flex-wrap gap-2">
                                                  {['身分証明書(表裏)', '健康保険証', '収入証明書', '在留カード', '学生証', '内定証明書', '銀行通帳'].map(doc => {
                                                    const isChecked = (app.documents || []).includes(doc);
                                                    return (
                                                      <label key={doc} className={`flex items-center space-x-1.5 text-xs px-2.5 py-1.5 rounded-md border cursor-pointer transition-colors ${isChecked ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                                                        <input 
                                                          type="checkbox" 
                                                          className="hidden" 
                                                          checked={isChecked} 
                                                          onChange={(e) => {
                                                            const current = app.documents || [];
                                                            const next = e.target.checked ? [...current, doc] : current.filter((c: string) => c !== doc);
                                                            handleUpdateApplication(phase.id, task.id, app.id, 'documents', next);
                                                          }} 
                                                        />
                                                        <div className={`w-3 h-3 rounded-sm border flex items-center justify-center transition-colors ${isChecked ? 'bg-blue-500 border-blue-500' : 'border-slate-300'}`}>
                                                          {isChecked && <CheckCircle2 className="w-2.5 h-2.5 text-white" />}
                                                        </div>
                                                        <span>{doc}</span>
                                                      </label>
                                                    )
                                                  })}
                                                </div>
                                              </div>

                                              <div className="bg-blue-50 p-3 rounded-md border border-blue-100 space-y-3">
                                                <p className="text-xs font-bold text-blue-800">審査状況</p>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                  <div>
                                                    <label className="block text-xs font-medium text-blue-700 mb-1">ステータス</label>
                                                    <select
                                                      className="w-full text-sm px-3 py-2 border border-blue-200 rounded-md focus:ring-2 focus:ring-blue-500 outline-none transition-shadow bg-white"
                                                      value={app.screeningStatus || '審査中'}
                                                      onChange={(e) => handleUpdateApplication(phase.id, task.id, app.id, 'screeningStatus', e.target.value)}
                                                    >
                                                      <option value="審査中">審査中</option>
                                                      <option value="審査通過">審査通過</option>
                                                      <option value="審査落ち(アーカイブ)">審査落ち (アーカイブ)</option>
                                                    </select>
                                                  </div>
                                                  <div className="sm:col-span-2">
                                                    <label className="block text-xs font-medium text-blue-700 mb-1">審査メモ (保証会社の変更履歴など)</label>
                                                    <CompositionTextarea 
                                                      className="w-full text-sm px-3 py-2 border border-blue-200 rounded-md focus:ring-2 focus:ring-blue-500 outline-none transition-shadow bg-white"
                                                      rows={2}
                                                      placeholder="例: A社否決のため、B社で再審査中"
                                                      value={app.screeningNotes || ''}
                                                      onChange={(val) => handleUpdateApplication(phase.id, task.id, app.id, 'screeningNotes', val)}
                                                    />
                                                  </div>
                                                </div>
                                              </div>
                                            </div>
                                          )})}
                                          
                                          <button 
                                            onClick={() => handleAddApplication(phase.id, task.id)}
                                            className="w-full py-2 border-2 border-dashed border-slate-300 text-slate-500 rounded-lg hover:border-blue-400 hover:text-blue-600 transition-colors flex items-center justify-center space-x-2 text-sm font-medium"
                                          >
                                            <Plus className="w-4 h-4" />
                                            <span>申込物件を追加</span>
                                          </button>
                                        </div>
                                      ) : (
                                        <p className={`text-xs sm:text-sm transition-colors ${task.completed ? 'text-slate-400' : 'text-slate-500'}`}>
                                          {task.description}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Factors Section */}
                            {phase.factors && phase.factors.length > 0 && (
                              <div className={`relative bg-white/50 p-8 sm:p-10 border border-luxury-border transition-all duration-700 ${phase.id === 'phase-1' && phase.tasks.find(t => t.id === 't1-1')?.completed ? 'bg-slate-50/80 saturate-[0.2]' : ''}`}>
                                {phase.id === 'phase-1' && (
                                  <div className="flex justify-between items-center mb-8">
                                    {phase.tasks.find(t => t.id === 't1-1')?.completed && (
                                      <div className="flex items-center space-x-2 text-luxury-sage bg-white px-3 py-1.5 border border-luxury-border shadow-sm animate-in fade-in slide-in-from-left-4 duration-500">
                                        <Archive className="w-4 h-4 text-prestige-gold" />
                                        <span className="text-[10px] font-display font-bold tracking-[0.2em] uppercase">Hearing Archived</span>
                                      </div>
                                    )}
                                    <button
                                      onClick={downloadHearingSheet}
                                      className={`flex items-center space-x-2 text-xs font-display font-bold tracking-widest uppercase bg-transparent text-luxury-ink hover:text-prestige-gold transition-colors ml-auto ${phase.tasks.find(t => t.id === 't1-1')?.completed ? '' : ''}`}
                                    >
                                      <Download className="w-4 h-4" />
                                      <span>ヒアリングシート出力</span>
                                    </button>
                                  </div>
                                )}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-10">
                                  {phase.factors.map(factor => {
                                    const isPhaseLocked = phase.id === 'phase-1' && phase.tasks.find(t => t.id === 't1-1')?.completed;
                                    
                                    // Conditional rendering for specific fields
                                    if (factor.id.endsWith('-other') || 
                                        factor.id === 'f1-occupants-disability-detail' || 
                                        factor.id === 'f1-parking-count' ||
                                        factor.id === 'f1-car-type' ||
                                        factor.id === 'f1-bicycle-type' ||
                                        factor.id === 'f1-pet-dog-detail' ||
                                        factor.id === 'f1-pet-cat-detail' ||
                                        factor.id.startsWith('f1-line-sub-') || 
                                        factor.id.startsWith('f1-line-stations-')) {
                                      let isVisible = false;

                                      if (factor.id.endsWith('-other')) {
                                        const parentId = factor.id.replace('-other', '');
                                        const parentFactor = phase.factors?.find(f => f.id === parentId);
                                        if (parentFactor) {
                                          isVisible = (Array.isArray(parentFactor.value) && parentFactor.value.includes('その他')) || (parentFactor.value === 'その他');
                                        }
                                      } else if (factor.id === 'f1-occupants-disability-detail') {
                                        const typeFactor = phase.factors?.find(f => f.id === 'f1-occupants-type');
                                        isVisible = Array.isArray(typeFactor?.value) && typeFactor.value.includes('身体障がい者');
                                      } else if (factor.id === 'f1-parking-count' || factor.id === 'f1-car-type') {
                                        const parkingFactor = phase.factors?.find(f => f.id === 'f1-parking-needed');
                                        isVisible = parkingFactor?.value === '要';
                                      } else if (factor.id === 'f1-bicycle-type') {
                                        const bicycleFactor = phase.factors?.find(f => f.id === 'f1-bicycle-needed');
                                        isVisible = bicycleFactor?.value === '要';
                                      } else if (factor.id === 'f1-pet-dog-detail' || factor.id === 'f1-pet-cat-detail') {
                                        const specialFactor = phase.factors?.find(f => f.id === 'f1-special');
                                        const target = factor.id === 'f1-pet-dog-detail' ? '犬' : '猫';
                                        isVisible = Array.isArray(specialFactor?.value) && specialFactor.value.includes(target);
                                      } else if (factor.id === 'f1-line-sub-jr') {
                                        const catFactor = phase.factors?.find(f => f.id === 'f1-line-category');
                                        isVisible = Array.isArray(catFactor?.value) && catFactor.value.includes('JR北海道');
                                      } else if (factor.id === 'f1-line-sub-subway') {
                                        const catFactor = phase.factors?.find(f => f.id === 'f1-line-category');
                                        isVisible = Array.isArray(catFactor?.value) && catFactor.value.includes('札幌地下鉄');
                                      } else if (factor.id === 'f1-line-sub-tram') {
                                        const catFactor = phase.factors?.find(f => f.id === 'f1-line-category');
                                        isVisible = Array.isArray(catFactor?.value) && catFactor.value.includes('市電・路面電車');
                                      } else if (factor.id.startsWith('f1-line-stations-')) {
                                        const lineName = factor.id.replace('f1-line-stations-', '');
                                        
                                        // Case 1: Shinkansen / Isaribi (Directly from category)
                                        const catFactor = phase.factors?.find(f => f.id === 'f1-line-category');
                                        const isDirectCat = Array.isArray(catFactor?.value) && catFactor.value.includes(lineName);
                                        
                                        // Case 2: Sub-lines (JR, Subway, Tram) - Must also check if parent category is selected
                                        const jrFactor = phase.factors?.find(f => f.id === 'f1-line-sub-jr');
                                        const subwayFactor = phase.factors?.find(f => f.id === 'f1-line-sub-subway');
                                        const tramFactor = phase.factors?.find(f => f.id === 'f1-line-sub-tram');
                                        
                                        const isJrSub = Array.isArray(catFactor?.value) && catFactor.value.includes('JR北海道') && Array.isArray(jrFactor?.value) && jrFactor.value.includes(lineName);
                                        const isSubwaySub = Array.isArray(catFactor?.value) && catFactor.value.includes('札幌地下鉄') && Array.isArray(subwayFactor?.value) && subwayFactor.value.includes(lineName);
                                        const isTramSub = Array.isArray(catFactor?.value) && catFactor.value.includes('市電・路面電車') && Array.isArray(tramFactor?.value) && tramFactor.value.includes(lineName);
                                        
                                        isVisible = isDirectCat || isJrSub || isSubwaySub || isTramSub;
                                      }
                                        
                                      if (!isVisible) return null;
                                    }

                                    return (
                                      <div key={factor.id} className={`space-y-4 ${factor.type === 'textarea' || factor.type === 'checkbox_group' || factor.type === 'fee_timing_group' || factor.id.endsWith('-other') ? 'md:col-span-2' : ''} ${isPhaseLocked ? 'pointer-events-none' : ''}`}>
                                        <label className={`text-base sm:text-lg font-display font-black tracking-widest uppercase block underline underline-offset-4 transition-colors ${isPhaseLocked ? 'text-luxury-sage/40 decoration-luxury-sage/20' : 'text-prestige-gold decoration-prestige-gold/30'}`}>{factor.title}</label>
                                        
                                        {(factor.type === 'text' || factor.type === 'textarea') && (
                                          <FactorInput factor={factor} phaseId={phase.id} handleFactorChange={handleFactorChange} disabled={isPhaseLocked} />
                                        )}
                                        
                                        {factor.type === 'select' && (
                                        <select 
                                          value={factor.value || ''} 
                                          onChange={(e) => handleFactorChange(phase.id, factor.id, e.target.value)} 
                                          disabled={isPhaseLocked}
                                          className={`w-full text-base sm:text-lg px-0 py-2 border-b bg-transparent outline-none transition-all placeholder:italic ${isPhaseLocked ? 'border-luxury-border/30 text-luxury-sage/40 cursor-not-allowed' : 'border-luxury-border focus:border-prestige-gold text-luxury-ink'}`}
                                        >
                                          <option value="">選択してください</option>
                                          {factor.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                        </select>
                                      )}
                                      
                                      {factor.type === 'checkbox_group' && (
                                        <div className="flex flex-wrap gap-4">
                                          {factor.options?.map(opt => {
                                            const isChecked = (factor.value as string[] || []).includes(opt);
                                            return (
                                              <label key={opt} className={`flex items-center space-x-2 text-base font-display font-bold tracking-widest uppercase px-6 py-4 border transition-all duration-300 ${isPhaseLocked ? (isChecked ? 'bg-luxury-sage/30 border-luxury-sage/30 text-luxury-ink/50' : 'bg-transparent border-luxury-border/20 text-luxury-sage/20') : (isChecked ? 'bg-luxury-ink border-luxury-ink text-white shadow-md cursor-pointer' : 'bg-transparent border-luxury-border text-luxury-sage hover:border-prestige-gold hover:bg-white cursor-pointer')}`}>
                                                <input 
                                                  type="checkbox" 
                                                  className="hidden" 
                                                  checked={isChecked} 
                                                  disabled={isPhaseLocked}
                                                  onChange={(e) => {
                                                    const current = factor.value as string[] || [];
                                                    const next = e.target.checked ? [...current, opt] : current.filter(c => c !== opt);
                                                    handleFactorChange(phase.id, factor.id, next);
                                                  }} 
                                                />
                                                <span>{opt}</span>
                                              </label>
                                            )
                                          })}
                                        </div>
                                      )}

                                      {factor.type === 'date' && (
                                        <div className="flex items-center space-x-6">
                                          <input 
                                            type="date" 
                                            value={factor.value || ''} 
                                            disabled={isPhaseLocked}
                                            onChange={(e) => handleFactorChange(phase.id, factor.id, e.target.value)} 
                                            className={`flex-1 text-base sm:text-lg px-0 py-2 border-b bg-transparent outline-none transition-all ${isPhaseLocked ? 'border-luxury-border/30 text-luxury-sage/40 cursor-not-allowed' : 'border-luxury-border focus:border-prestige-gold text-luxury-ink'}`}
                                          />
                                          {factor.value && factor.id.includes('birth') && (
                                            <span className={`text-base font-display font-bold tracking-widest uppercase px-4 py-2 border transition-colors ${isPhaseLocked ? 'text-luxury-sage/40 bg-luxury-sage/5 border-luxury-sage/10' : 'text-prestige-gold bg-prestige-gold/5 border-prestige-gold/10'}`}>
                                              {calculateAgeAndEra(factor.value)}
                                            </span>
                                          )}
                                        </div>
                                      )}

                                      {factor.type === 'fee_timing_group' && (
                                        <div className="space-y-3">
                                          <div className="flex flex-wrap gap-2">
                                            {['敷金ゼロ', '礼金ゼロ', 'フリーレント希望', 'ネット無料'].map(opt => {
                                              const isChecked = (factor.value as string[] || []).includes(opt);
                                              return (
                                                <label key={opt} className={`flex items-center space-x-1.5 text-xs px-2.5 py-1.5 rounded-md border transition-colors ${isPhaseLocked ? (isChecked ? 'bg-slate-100 border-slate-200 text-slate-400' : 'bg-transparent border-slate-100 text-slate-300') : (isChecked ? 'bg-blue-50 border-blue-200 text-blue-700 cursor-pointer' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer')}`}>
                                                  <input 
                                                    type="checkbox" 
                                                    className="hidden" 
                                                    checked={isChecked} 
                                                    disabled={isPhaseLocked}
                                                    onChange={(e) => {
                                                      const current = factor.value as string[] || [];
                                                      const next = e.target.checked ? [...current, opt] : current.filter(c => c !== opt);
                                                      handleFactorChange(phase.id, factor.id, next);
                                                    }} 
                                                  />
                                                  <div className={`w-3 h-3 rounded-sm border flex items-center justify-center transition-colors ${isChecked ? (isPhaseLocked ? 'bg-slate-300 border-slate-300' : 'bg-blue-500 border-blue-500') : 'border-slate-300'}`}>
                                                    {isChecked && <CheckCircle2 className="w-2.5 h-2.5 text-white" />}
                                                  </div>
                                                  <span>{opt}</span>
                                                </label>
                                              )
                                            })}
                                          </div>
                                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {['部屋清掃費', '水廻り消毒代', 'FF清掃費', 'エアコン清掃費'].map(opt => {
                                              const contractOpt = `${opt}(契約時)`;
                                              const moveoutOpt = `${opt}(退去時)`;
                                              const isContractChecked = (factor.value as string[] || []).includes(contractOpt);
                                              const isMoveoutChecked = (factor.value as string[] || []).includes(moveoutOpt);
                                              
                                              return (
                                                <div key={opt} className="flex items-center justify-between bg-slate-50 p-2.5 rounded-md border border-slate-200">
                                                  <span className="text-sm font-medium text-slate-700">{opt}</span>
                                                  <div className="flex items-center space-x-4">
                                                    <label className="flex items-center space-x-1.5 cursor-pointer">
                                                      <input 
                                                        type="checkbox" 
                                                        className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                                                        checked={isContractChecked}
                                                        onChange={(e) => {
                                                          const current = factor.value as string[] || [];
                                                          const next = e.target.checked ? [...current, contractOpt] : current.filter(c => c !== contractOpt);
                                                          handleFactorChange(phase.id, factor.id, next);
                                                        }}
                                                      />
                                                      <span className="text-xs text-slate-600">契約時</span>
                                                    </label>
                                                    <label className="flex items-center space-x-1.5 cursor-pointer">
                                                      <input 
                                                        type="checkbox" 
                                                        className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                                                        checked={isMoveoutChecked}
                                                        onChange={(e) => {
                                                          const current = factor.value as string[] || [];
                                                          const next = e.target.checked ? [...current, moveoutOpt] : current.filter(c => c !== moveoutOpt);
                                                          handleFactorChange(phase.id, factor.id, next);
                                                        }}
                                                      />
                                                      <span className="text-xs text-slate-600">退去時</span>
                                                    </label>
                                                  </div>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )})}
                                </div>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="text-center max-w-sm">
              <div className="w-24 h-24 bg-luxury-ink/5 rounded-full flex items-center justify-center mx-auto mb-8 border border-luxury-border/50">
                <ClipboardList className="w-10 h-10 text-prestige-gold opacity-40" />
              </div>
              <h3 className="text-xl font-light font-serif text-luxury-ink mb-4 tracking-tight uppercase">未選択</h3>
              <p className="text-sm font-display font-bold tracking-widest text-luxury-sage uppercase leading-relaxed">左側のメニューからお客様を選択するか、<br/>新しい案件を登録してください。</p>
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="mt-10 md:hidden px-8 py-3 bg-luxury-ink text-white text-xs font-display font-bold tracking-[0.2em] uppercase transition-all hover:bg-prestige-gold"
              >
                メニューを開く
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}