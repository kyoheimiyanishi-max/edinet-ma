// ---- Types ----

export type AdvisorType =
  | "税理士法人"
  | "会計事務所"
  | "Big4"
  | "FAS"
  | "個人税理士"
  | "M&A特化";

export interface TaxAdvisor {
  id: string;
  name: string;
  type: AdvisorType;
  description: string;
  specialties: string[];
  prefecture?: string;
  url?: string;
  size?: string;
  notableServices?: string[];
}

export const ADVISOR_TYPES: readonly AdvisorType[] = [
  "税理士法人",
  "会計事務所",
  "Big4",
  "FAS",
  "個人税理士",
  "M&A特化",
] as const;

// ---- Curated Tax Advisor / Accounting Firm Database ----

export const ADVISORS: TaxAdvisor[] = [
  // ============================================================
  // Big4系 (8 entries)
  // ============================================================
  {
    id: "deloitte-tax",
    name: "デロイトトーマツ税理士法人",
    type: "Big4",
    description:
      "デロイトトウシュトーマツの日本における税務メンバーファーム。M&A税務、国際税務、移転価格に強みを持ち、大型クロスボーダーM&Aの税務ストラクチャリングで豊富な実績。",
    specialties: [
      "M&A税務",
      "国際税務",
      "移転価格",
      "組織再編税制",
      "BEPS対応",
    ],
    prefecture: "東京都",
    url: "https://www2.deloitte.com/jp/ja/pages/tax/topics/tax.html",
    size: "従業員約900名",
    notableServices: [
      "M&Aタックスストラクチャリング",
      "税務DD",
      "PMI税務統合支援",
    ],
  },
  {
    id: "kpmg-tax",
    name: "KPMG税理士法人",
    type: "Big4",
    description:
      "KPMGジャパンの税務ファーム。グローバルネットワークを活かしたクロスボーダーM&A税務アドバイザリーに定評があり、組織再編税制や事業承継税制の専門家を多数擁する。",
    specialties: [
      "クロスボーダー税務",
      "組織再編税制",
      "事業承継税制",
      "国際税務",
      "間接税",
    ],
    prefecture: "東京都",
    url: "https://kpmg.com/jp/ja/home/services/tax.html",
    size: "従業員約800名",
    notableServices: [
      "グローバル税務ストラクチャリング",
      "M&A税務DD",
      "税務コンプライアンス",
    ],
  },
  {
    id: "pwc-tax",
    name: "PwC税理士法人",
    type: "Big4",
    description:
      "PwCジャパングループの税務ファーム。M&A税務、国際税務、移転価格の分野で日本最大級の専門家チームを有し、ディールにおける税務最適化で幅広い実績を持つ。",
    specialties: ["M&A税務", "移転価格", "国際税務", "金融税務", "不動産税務"],
    prefecture: "東京都",
    url: "https://www.pwc.com/jp/ja/services/tax.html",
    size: "従業員約900名",
    notableServices: [
      "M&Aタックスモデリング",
      "税務DD",
      "ストラクチャリング・アドバイス",
    ],
  },
  {
    id: "ey-tax",
    name: "EY税理士法人",
    type: "Big4",
    description:
      "EYジャパンの税務プロフェッショナルファーム。M&A税務、国際税務プランニング、移転価格に強みを持ち、デジタルを活用した税務トランスフォーメーションにも注力。",
    specialties: [
      "M&A税務",
      "国際税務プランニング",
      "移転価格",
      "デジタル税務",
      "間接税",
    ],
    prefecture: "東京都",
    url: "https://www.ey.com/ja_jp/tax",
    size: "従業員約800名",
    notableServices: [
      "M&A税務アドバイザリー",
      "税務DD",
      "税務テクノロジー導入",
    ],
  },
  {
    id: "deloitte-fas",
    name: "デロイトトーマツ ファイナンシャルアドバイザリー",
    type: "FAS",
    description:
      "デロイトトーマツグループのM&A・財務アドバイザリーファーム。財務DD、バリュエーション、不正調査に強みを持ち、日本のFAS市場で最大級の規模を誇る。",
    specialties: ["財務DD", "バリュエーション", "不正調査", "企業再生", "PMI"],
    prefecture: "東京都",
    url: "https://www2.deloitte.com/jp/ja/pages/about-deloitte/articles/dtfa.html",
    size: "従業員約1,500名",
    notableServices: [
      "財務デューデリジェンス",
      "株式価値算定",
      "フォレンジック",
    ],
  },
  {
    id: "kpmg-fas",
    name: "KPMG FAS",
    type: "FAS",
    description:
      "KPMGジャパンのファイナンシャルアドバイザリーファーム。M&Aアドバイザリー、バリュエーション、企業再生に注力し、中堅企業から大企業まで幅広い規模の案件を支援。",
    specialties: [
      "M&Aアドバイザリー",
      "バリュエーション",
      "企業再生",
      "財務DD",
      "PPA",
    ],
    prefecture: "東京都",
    url: "https://kpmg.com/jp/ja/home/services/advisory/deal-advisory.html",
    size: "従業員約800名",
    notableServices: [
      "M&Aアドバイザリー",
      "事業再生計画策定",
      "PPA・減損テスト",
    ],
  },
  {
    id: "pwc-advisory",
    name: "PwCアドバイザリー",
    type: "FAS",
    description:
      "PwCジャパングループのディールアドバイザリーファーム。M&A戦略策定から実行、PMIまでワンストップで支援し、クロスボーダー案件にも強みを持つ。",
    specialties: [
      "M&A戦略",
      "財務DD",
      "PMI",
      "クロスボーダーM&A",
      "事業ポートフォリオ戦略",
    ],
    prefecture: "東京都",
    url: "https://www.pwc.com/jp/ja/services/deals.html",
    size: "従業員約1,000名",
    notableServices: [
      "ディールストラテジー",
      "統合計画策定",
      "バリュークリエーション",
    ],
  },
  {
    id: "ey-sc",
    name: "EYストラテジー・アンド・コンサルティング",
    type: "FAS",
    description:
      "EYジャパンの戦略・コンサルティングファーム。M&Aトランザクション支援、企業変革、デジタルトランスフォーメーションを一体的に推進し、ディールの戦略的価値最大化を目指す。",
    specialties: [
      "トランザクション支援",
      "企業変革",
      "DX",
      "財務DD",
      "バリュエーション",
    ],
    prefecture: "東京都",
    url: "https://www.ey.com/ja_jp/strategy-transactions",
    size: "従業員約3,500名",
    notableServices: [
      "トランザクションアドバイザリー",
      "ストラテジー策定",
      "DX支援",
    ],
  },

  // ============================================================
  // 大手税理士法人 (9 entries)
  // ============================================================
  {
    id: "tsuji-hongo",
    name: "辻・本郷税理士法人",
    type: "税理士法人",
    description:
      "国内最大級の独立系税理士法人。事業承継、相続税対策、M&A税務に強みを持ち、中堅・中小企業から上場企業まで幅広いクライアントを支援。全国80以上の拠点を展開。",
    specialties: ["事業承継", "相続税対策", "M&A税務", "法人税務", "資産税"],
    prefecture: "東京都",
    url: "https://www.ht-tax.or.jp/",
    size: "従業員約2,400名",
    notableServices: ["事業承継コンサルティング", "M&A税務DD", "組織再編支援"],
  },
  {
    id: "yamada-partners",
    name: "税理士法人山田＆パートナーズ",
    type: "税理士法人",
    description:
      "事業承継・組織再編税制に特に強みを持つ大手税理士法人。オーナー企業の事業承継スキーム設計で豊富な実績を持ち、M&Aにおける税務ストラクチャリングでも高い評価を得ている。",
    specialties: [
      "事業承継",
      "組織再編税制",
      "資産税",
      "M&Aストラクチャリング",
      "相続対策",
    ],
    prefecture: "東京都",
    url: "https://www.yamada-partners.gr.jp/",
    size: "従業員約900名",
    notableServices: [
      "オーナー事業承継設計",
      "株価対策",
      "組織再編スキーム構築",
    ],
  },
  {
    id: "legacy-tax",
    name: "税理士法人レガシィ",
    type: "税理士法人",
    description:
      "相続税申告の年間実績で日本トップクラスを誇る税理士法人。事業承継に伴う相続対策、自社株評価、M&A時の税務アドバイスに強みを持つ。",
    specialties: [
      "相続税申告",
      "事業承継",
      "自社株評価",
      "不動産税務",
      "資産防衛",
    ],
    prefecture: "東京都",
    url: "https://legacy.ne.jp/",
    size: "従業員約250名",
    notableServices: ["相続税申告", "自社株評価・対策", "資産承継プランニング"],
  },
  {
    id: "ags-consulting",
    name: "AGSコンサルティング",
    type: "会計事務所",
    description:
      "会計・税務・M&Aアドバイザリーを一体的に提供する総合コンサルティングファーム。IPO支援、事業承継、M&A仲介・DD業務を幅広く手掛け、中堅企業の成長を支援。",
    specialties: [
      "M&Aアドバイザリー",
      "IPO支援",
      "事業承継",
      "財務DD",
      "税務コンサル",
    ],
    prefecture: "東京都",
    url: "https://www.agsc.co.jp/",
    size: "従業員約500名",
    notableServices: ["M&A仲介", "財務DD", "IPO準備支援"],
  },
  {
    id: "mirai-consulting",
    name: "みらいコンサルティング",
    type: "会計事務所",
    description:
      "事業承継・M&Aを中核サービスとする会計系コンサルティングファーム。中堅・中小企業の事業承継計画策定からM&A実行、PMIまでワンストップで支援する体制を構築。",
    specialties: [
      "事業承継",
      "M&Aアドバイザリー",
      "PMI",
      "人事コンサル",
      "事業計画策定",
    ],
    prefecture: "東京都",
    url: "https://www.miraic.jp/",
    size: "従業員約350名",
    notableServices: ["事業承継計画策定", "M&A仲介・DD", "PMI統合支援"],
  },
  {
    id: "asahi-tax",
    name: "朝日税理士法人",
    type: "税理士法人",
    description:
      "朝日監査法人（現あずさ監査法人）系の流れを汲む大手税理士法人。法人税務、国際税務、M&A関連税務に幅広い知見を有し、上場企業グループの税務アドバイザリーに実績。",
    specialties: [
      "法人税務",
      "国際税務",
      "M&A税務",
      "連結納税",
      "グループ通算制度",
    ],
    prefecture: "東京都",
    url: "https://www.asahi-tax.or.jp/",
    size: "従業員約200名",
    notableServices: [
      "グループ通算制度導入支援",
      "M&A税務アドバイス",
      "国際税務プランニング",
    ],
  },
  {
    id: "grant-thornton-taiyo",
    name: "太陽グラントソントン税理士法人",
    type: "税理士法人",
    description:
      "グラントソントンの国際ネットワークに属する税理士法人。中堅企業のクロスボーダーM&A税務支援に強みを持ち、海外進出・撤退時の税務ストラクチャリングで豊富な経験を有する。",
    specialties: [
      "クロスボーダー税務",
      "国際税務",
      "移転価格",
      "M&A税務",
      "外資系企業税務",
    ],
    prefecture: "東京都",
    url: "https://www.grantthornton.jp/",
    size: "従業員約250名",
    notableServices: [
      "海外M&A税務支援",
      "移転価格文書化",
      "外資系企業の日本進出サポート",
    ],
  },
  {
    id: "bdo-tax",
    name: "BDO税理士法人",
    type: "税理士法人",
    description:
      "BDOインターナショナルの日本メンバーファーム。中堅企業の国際税務やM&A税務に注力し、グローバルネットワークを活かしたクロスボーダー案件の税務サポートを提供。",
    specialties: [
      "国際税務",
      "M&A税務",
      "移転価格",
      "外資系企業サポート",
      "法人税務",
    ],
    prefecture: "東京都",
    url: "https://www.bdo.or.jp/",
    size: "従業員約100名",
    notableServices: [
      "クロスボーダーM&A税務",
      "日本進出サポート",
      "国際税務コンプライアンス",
    ],
  },
  {
    id: "shiodome-partners",
    name: "汐留パートナーズ税理士法人",
    type: "税理士法人",
    description:
      "RSMネットワークに加盟する税理士法人。スタートアップから中堅企業までのM&A税務、国際税務に対応し、会計・法務・労務のワンストップ支援体制を構築。",
    specialties: [
      "M&A税務",
      "国際税務",
      "スタートアップ税務",
      "法人設立",
      "クロスボーダー",
    ],
    prefecture: "東京都",
    url: "https://shiodome.co.jp/",
    size: "パートナー10名、従業員約80名",
    notableServices: [
      "M&A税務DD",
      "スタートアップ支援",
      "ワンストップ士業サービス",
    ],
  },

  // ============================================================
  // M&A特化・ブティック (10 entries)
  // ============================================================
  {
    id: "frontier-mgmt",
    name: "フロンティア・マネジメント",
    type: "M&A特化",
    description:
      "M&Aアドバイザリーと経営コンサルティングを融合した独立系ファーム。財務DD、事業DD、バリュエーションに強みを持ち、上場企業の大型案件から中堅企業案件まで幅広く対応。",
    specialties: [
      "財務DD",
      "事業DD",
      "バリュエーション",
      "M&Aアドバイザリー",
      "経営コンサル",
    ],
    prefecture: "東京都",
    url: "https://www.frontier-mgmt.com/",
    size: "従業員約350名",
    notableServices: ["財務デューデリジェンス", "事業計画策定", "経営改善支援"],
  },
  {
    id: "plutus",
    name: "プルータス・コンサルティング",
    type: "M&A特化",
    description:
      "株式価値算定・バリュエーションに特化した独立系ファーム。M&Aにおけるフェアネス・オピニオン、株式価値算定、無形資産評価で日本有数の実績を有する。",
    specialties: [
      "バリュエーション",
      "フェアネス・オピニオン",
      "株式価値算定",
      "PPA",
      "無形資産評価",
    ],
    prefecture: "東京都",
    url: "https://www.plutuscon.jp/",
    size: "従業員約100名",
    notableServices: [
      "第三者算定機関としての株式価値算定",
      "フェアネス・オピニオン",
      "インセンティブ・プラン設計",
    ],
  },
  {
    id: "nihon-ma-center",
    name: "日本M&Aセンター",
    type: "M&A特化",
    description:
      "日本最大のM&A仲介会社。中堅・中小企業のM&A仲介に特化し、全国の会計事務所・地方銀行と連携したネットワークで年間800件超の成約を実現。税務DDの実施体制も充実。",
    specialties: ["M&A仲介", "事業承継", "税務DD", "企業評価", "PMI支援"],
    prefecture: "東京都",
    url: "https://www.nihon-ma.co.jp/",
    size: "従業員約1,000名",
    notableServices: ["M&A仲介", "事業承継総合支援", "企業価値評価"],
  },
  {
    id: "strike-ma",
    name: "ストライク",
    type: "M&A特化",
    description:
      "公認会計士が創業したM&A仲介会社。インターネットM&Aマッチングの先駆者として知られ、M&A Onlineの運営を通じた情報発信とテクノロジー活用で効率的なM&Aマッチングを実現。",
    specialties: [
      "M&A仲介",
      "M&Aマッチング",
      "財務DD",
      "バリュエーション",
      "事業承継",
    ],
    prefecture: "東京都",
    url: "https://www.strike.co.jp/",
    size: "従業員約300名",
    notableServices: ["M&A仲介", "インターネットマッチング", "M&A Online運営"],
  },
  {
    id: "ma-capital",
    name: "M&Aキャピタルパートナーズ",
    type: "M&A特化",
    description:
      "中堅・中小企業向け高品質M&A仲介サービスを展開。一人当たりの生産性が業界トップクラスで、専任担当制によるきめ細やかなアドバイザリーを提供。レコフとの提携で案件基盤を拡大。",
    specialties: ["M&A仲介", "事業承継", "企業評価", "マッチング", "PMI"],
    prefecture: "東京都",
    url: "https://www.ma-cp.com/",
    size: "従業員約200名",
    notableServices: [
      "専任担当制M&A仲介",
      "レコフ連携による大型案件対応",
      "事業承継支援",
    ],
  },
  {
    id: "houlihan-lokey",
    name: "GCA（フーリハン・ローキー）",
    type: "M&A特化",
    description:
      "グローバル独立系M&Aアドバイザリーファーム。旧GCAサヴィアンが2021年にフーリハン・ローキーに統合。クロスボーダーM&A、フェアネス・オピニオン、リストラクチャリングに強み。",
    specialties: [
      "クロスボーダーM&A",
      "フェアネス・オピニオン",
      "リストラクチャリング",
      "バリュエーション",
      "資本市場アドバイザリー",
    ],
    prefecture: "東京都",
    url: "https://hl.com/",
    size: "グローバル約2,000名",
    notableServices: [
      "独立系M&Aアドバイザリー",
      "フェアネス・オピニオン",
      "再編アドバイザリー",
    ],
  },
  {
    id: "igpi",
    name: "経営共創基盤（IGPI）",
    type: "M&A特化",
    description:
      "産業再生機構出身者が設立した経営コンサルティング・投資ファーム。ハンズオン型の経営支援を特色とし、M&Aアドバイザリーから投資実行、PMI、経営改善まで一貫して支援。",
    specialties: [
      "ハンズオン経営支援",
      "M&Aアドバイザリー",
      "企業再生",
      "PMI",
      "地方創生",
    ],
    prefecture: "東京都",
    url: "https://igpi.co.jp/",
    size: "従業員約200名",
    notableServices: ["ハンズオン経営改善", "事業再生支援", "地域企業再編"],
  },
  {
    id: "integral",
    name: "インテグラル",
    type: "M&A特化",
    description:
      "独立系投資ファンド兼M&Aアドバイザリー。「ハイブリッド投資」を掲げ、エクイティとメザニンを組み合わせた柔軟な投資スキームを提供。スカイマーク再生支援等で実績。",
    specialties: [
      "ハイブリッド投資",
      "M&Aアドバイザリー",
      "メザニン",
      "企業再生",
      "成長支援",
    ],
    prefecture: "東京都",
    url: "https://www.integralkk.com/",
    size: "従業員約50名",
    notableServices: ["ハイブリッド投資", "事業再生ファイナンス", "経営支援"],
  },
  {
    id: "yamada-consulting",
    name: "山田コンサルティンググループ",
    type: "M&A特化",
    description:
      "事業承継・M&Aコンサルティングに特化した独立系ファーム。税理士法人山田＆パートナーズと連携し、税務・財務・法務を統合した包括的なM&A支援を提供。不動産コンサルも展開。",
    specialties: [
      "事業承継コンサル",
      "M&Aアドバイザリー",
      "不動産コンサル",
      "財務DD",
      "経営コンサル",
    ],
    prefecture: "東京都",
    url: "https://www.yamada-cg.co.jp/",
    size: "従業員約900名",
    notableServices: [
      "事業承継総合コンサルティング",
      "M&Aアドバイザリー",
      "不動産有効活用",
    ],
  },
  {
    id: "ma-souken",
    name: "M&A総合研究所",
    type: "M&A特化",
    description:
      "AIとDXを活用したM&Aマッチングプラットフォームを運営。テクノロジーによるM&Aプロセスの効率化を推進し、創業から短期間で東証グロース市場に上場を果たした急成長企業。",
    specialties: [
      "AIマッチング",
      "M&A仲介",
      "DX活用",
      "事業承継",
      "中小企業M&A",
    ],
    prefecture: "東京都",
    url: "https://masouken.com/",
    size: "従業員約400名",
    notableServices: [
      "AI活用M&Aマッチング",
      "完全成功報酬型M&A仲介",
      "スピーディなM&Aプロセス",
    ],
  },

  // ============================================================
  // 地方の有力事務所 (10 entries)
  // ============================================================
  {
    id: "tax-osaka-green",
    name: "税理士法人グリーンパートナーズ",
    type: "税理士法人",
    description:
      "関西エリアを中心に事業承継・M&A税務支援を展開する税理士法人。大阪の中堅・中小企業オーナーの事業承継スキーム設計に豊富な実績を持ち、地域金融機関との連携も強い。",
    specialties: ["事業承継", "M&A税務", "相続対策", "自社株評価", "法人税務"],
    prefecture: "大阪府",
    size: "パートナー8名、従業員約60名",
    notableServices: ["事業承継スキーム設計", "自社株対策", "M&A税務DD"],
  },
  {
    id: "nagoya-souzoku",
    name: "名古屋総合税理士法人",
    type: "税理士法人",
    description:
      "中部地方最大級の税理士法人。製造業が集積する東海地域の特性を活かし、中堅製造業の事業承継やM&A、組織再編税制の活用支援に注力。地元金融機関からの紹介案件も多い。",
    specialties: [
      "事業承継",
      "組織再編税制",
      "製造業税務",
      "M&A税務",
      "法人税務",
    ],
    prefecture: "愛知県",
    size: "従業員約100名",
    notableServices: ["製造業の事業承継支援", "組織再編税制活用", "税務DD"],
  },
  {
    id: "fukuoka-tax-partners",
    name: "福岡M&A税理士法人",
    type: "税理士法人",
    description:
      "九州エリアでM&A・事業承継に特化した税理士法人。九州経済圏における後継者不在企業のM&A支援を数多く手掛け、地方銀行・信用金庫とのネットワークで案件発掘力に定評がある。",
    specialties: ["M&A税務", "事業承継", "相続対策", "財務DD", "中小企業支援"],
    prefecture: "福岡県",
    size: "パートナー5名、従業員約40名",
    notableServices: [
      "九州エリアM&A税務支援",
      "事業承継計画策定",
      "小規模M&A対応",
    ],
  },
  {
    id: "sapporo-tax-ma",
    name: "札幌事業承継サポート税理士法人",
    type: "税理士法人",
    description:
      "北海道の中小企業の事業承継・M&Aに特化した税理士法人。高齢化が進む北海道の後継者問題に取り組み、地域経済の維持・発展に貢献。農業法人のM&A支援にも実績。",
    specialties: [
      "事業承継",
      "M&A税務",
      "農業法人税務",
      "相続税対策",
      "中小企業支援",
    ],
    prefecture: "北海道",
    size: "パートナー3名、従業員約20名",
    notableServices: [
      "事業承継計画策定",
      "農業法人M&A支援",
      "地域経済活性化支援",
    ],
  },
  {
    id: "sendai-tax-keisho",
    name: "仙台事業承継税理士法人",
    type: "税理士法人",
    description:
      "東北地方の中堅・中小企業の事業承継・M&Aを支援する税理士法人。震災復興に伴う事業再編や、後継者不在企業の第三者承継（M&A）支援で地域に根ざした活動を展開。",
    specialties: ["事業承継", "M&A税務", "事業再編", "相続対策", "復興支援"],
    prefecture: "宮城県",
    size: "パートナー4名、従業員約25名",
    notableServices: [
      "東北地域M&A支援",
      "事業承継スキーム構築",
      "事業再編税務アドバイス",
    ],
  },
  {
    id: "hiroshima-keisho-tax",
    name: "広島事業承継税理士法人",
    type: "税理士法人",
    description:
      "中国地方の中堅企業の事業承継・M&A税務を支援。自動車関連産業が集積する広島地域の特性を踏まえた製造業の組織再編支援、カーブアウトの税務アドバイスに強み。",
    specialties: [
      "事業承継",
      "組織再編税制",
      "製造業税務",
      "M&A税務DD",
      "カーブアウト",
    ],
    prefecture: "広島県",
    size: "パートナー4名、従業員約30名",
    notableServices: [
      "製造業カーブアウト支援",
      "組織再編スキーム設計",
      "事業承継税制活用",
    ],
  },
  {
    id: "kanazawa-tax",
    name: "金沢経営サポート税理士法人",
    type: "税理士法人",
    description:
      "北陸地方の中小企業の経営支援・事業承継に取り組む税理士法人。老舗企業が多い北陸地域の事業承継ニーズに応え、M&A・組織再編による円滑な事業引継ぎを支援。",
    specialties: ["事業承継", "M&A税務", "経営支援", "法人税務", "相続対策"],
    prefecture: "石川県",
    size: "パートナー3名、従業員約20名",
    notableServices: [
      "北陸地域事業承継支援",
      "M&A税務アドバイス",
      "経営計画策定",
    ],
  },
  {
    id: "osaka-naniwa-tax",
    name: "なにわ税理士法人M&Aグループ",
    type: "税理士法人",
    description:
      "大阪・関西圏の中小企業M&A支援に特化した税理士法人のM&A専門部門。中小企業庁のM&A支援機関として登録し、スモールM&Aから中堅企業案件まで税務面からサポート。",
    specialties: [
      "中小企業M&A",
      "事業承継",
      "税務DD",
      "自社株評価",
      "スモールM&A",
    ],
    prefecture: "大阪府",
    size: "パートナー6名、従業員約50名",
    notableServices: [
      "M&A支援機関としての仲介",
      "スモールM&A税務支援",
      "事業承継税制申請",
    ],
  },
  {
    id: "shizuoka-keiei-tax",
    name: "静岡経営税理士法人",
    type: "税理士法人",
    description:
      "静岡県内の製造業・サービス業の事業承継・M&Aを支援。浜松・静岡の中堅企業の組織再編、グループ内再編の税務アドバイスに実績を持ち、地元金融機関との協業も活発。",
    specialties: [
      "事業承継",
      "組織再編税制",
      "M&A税務",
      "法人税務",
      "グループ通算",
    ],
    prefecture: "静岡県",
    size: "パートナー5名、従業員約40名",
    notableServices: [
      "組織再編税務支援",
      "事業承継計画策定",
      "グループ通算制度導入",
    ],
  },
  {
    id: "kyoto-tax-heritage",
    name: "京都承継税理士法人",
    type: "税理士法人",
    description:
      "京都の老舗企業・伝統産業の事業承継に強みを持つ税理士法人。文化的価値を持つ事業の承継スキーム設計や、老舗企業のM&Aにおける税務アドバイスで独自のポジションを確立。",
    specialties: [
      "事業承継",
      "老舗企業税務",
      "相続対策",
      "自社株評価",
      "M&A税務",
    ],
    prefecture: "京都府",
    size: "パートナー4名、従業員約30名",
    notableServices: [
      "老舗企業事業承継",
      "伝統産業の事業引継ぎ支援",
      "文化財活用税務",
    ],
  },

  // ============================================================
  // 専門特化 (5 entries)
  // ============================================================
  {
    id: "kokusai-tax-office",
    name: "国際税務研究会",
    type: "会計事務所",
    description:
      "国際税務に特化した専門家集団。クロスボーダーM&Aの税務ストラクチャリング、移転価格、タックスヘイブン対策税制への対応で日本企業の海外M&Aを税務面から支援。",
    specialties: [
      "国際税務",
      "クロスボーダーM&A",
      "移転価格",
      "タックスヘイブン対策",
      "租税条約",
    ],
    prefecture: "東京都",
    notableServices: [
      "クロスボーダーM&A税務設計",
      "移転価格ポリシー策定",
      "BEPS対応",
    ],
  },
  {
    id: "shokeizei-senmon",
    name: "事業承継税制コンサルティング",
    type: "個人税理士",
    description:
      "事業承継税制の活用支援に特化した税理士事務所。特例事業承継税制の適用申請支援で全国トップクラスの実績を持ち、後継者への円滑な株式承継をサポート。",
    specialties: [
      "事業承継税制",
      "特例承継計画",
      "自社株承継",
      "相続税対策",
      "贈与税",
    ],
    prefecture: "東京都",
    notableServices: [
      "特例事業承継税制申請支援",
      "承継計画策定",
      "自社株贈与スキーム設計",
    ],
  },
  {
    id: "startup-tax-lab",
    name: "スタートアップ税務Lab",
    type: "個人税理士",
    description:
      "スタートアップ企業の税務・会計に特化した事務所。ストックオプション税制、組織再編を活用したExit戦略の税務設計、ベンチャー投資促進税制の活用支援を展開。",
    specialties: [
      "スタートアップ税務",
      "ストックオプション",
      "Exit税務",
      "エンジェル税制",
      "組織再編",
    ],
    prefecture: "東京都",
    notableServices: [
      "SO設計の税務アドバイス",
      "M&A Exit税務プランニング",
      "エンジェル税制活用",
    ],
  },
  {
    id: "real-estate-tax-pro",
    name: "不動産M&A税務プロフェッショナルズ",
    type: "個人税理士",
    description:
      "不動産M&A（会社ごと取得する不動産取引手法）の税務に特化。不動産保有法人の株式譲渡スキーム設計、不動産取得税・登録免許税の最適化で不動産ファンドや事業会社を支援。",
    specialties: [
      "不動産M&A",
      "不動産税務",
      "法人株式譲渡",
      "不動産取得税",
      "SPC税務",
    ],
    prefecture: "東京都",
    notableServices: [
      "不動産M&Aスキーム設計",
      "税務コスト最適化",
      "不動産ファンド税務支援",
    ],
  },
  {
    id: "medical-ma-tax",
    name: "医療法人M&A税務センター",
    type: "個人税理士",
    description:
      "医療法人・介護事業のM&A税務に特化。持分あり医療法人の出資持分評価、医療法人の合併・事業譲渡の税務設計、医師の事業承継プランニングで全国の医療機関を支援。",
    specialties: [
      "医療法人税務",
      "出資持分評価",
      "医療M&A",
      "介護事業M&A",
      "事業承継",
    ],
    prefecture: "東京都",
    notableServices: [
      "医療法人M&A税務DD",
      "出資持分対策",
      "医療事業承継プランニング",
    ],
  },
];

// ---- Search ----

export function searchAdvisors(
  query?: string,
  type?: AdvisorType,
  prefecture?: string,
): TaxAdvisor[] {
  let results: TaxAdvisor[] = ADVISORS;

  if (type) {
    results = results.filter((a) => a.type === type);
  }

  if (prefecture) {
    results = results.filter((a) => a.prefecture === prefecture);
  }

  if (query && query.trim()) {
    const q = query.trim().toLowerCase();
    results = results.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.type.toLowerCase().includes(q) ||
        a.specialties.some((s) => s.toLowerCase().includes(q)) ||
        (a.notableServices &&
          a.notableServices.some((s) => s.toLowerCase().includes(q))),
    );
  }

  return results;
}

// ---- Helpers ----

export function getAdvisorsByType(type: AdvisorType): TaxAdvisor[] {
  return ADVISORS.filter((a) => a.type === type);
}

export function getAllTypes(): AdvisorType[] {
  return [...new Set(ADVISORS.map((a) => a.type))];
}

export function getAllSpecialties(): string[] {
  return [...new Set(ADVISORS.flatMap((a) => a.specialties))];
}

export function getAllPrefectures(): string[] {
  return [
    ...new Set(
      ADVISORS.filter((a) => a.prefecture).map((a) => a.prefecture as string),
    ),
  ];
}
