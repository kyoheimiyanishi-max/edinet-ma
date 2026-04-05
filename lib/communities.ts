// ---- Types ----

export type CommunityType =
  | "経営者団体"
  | "業界団体"
  | "勉強会"
  | "交流会"
  | "オンライン"
  | "投資家コミュニティ"
  | "士業ネットワーク"
  | "アカデミア";

export interface Community {
  id: string;
  name: string;
  description: string;
  url?: string;
  prefecture?: string;
  type: CommunityType;
  memberCount?: number;
  focusAreas: string[];
  established?: number;
}

export const COMMUNITY_TYPES: readonly CommunityType[] = [
  "経営者団体",
  "業界団体",
  "勉強会",
  "交流会",
  "オンライン",
  "投資家コミュニティ",
  "士業ネットワーク",
  "アカデミア",
] as const;

// ---- Curated Business/Owner Communities Database ----

export const COMMUNITIES: Community[] = [
  // ============================================================
  // 経営者団体 (17 entries)
  // ============================================================
  {
    id: "keidanren",
    name: "日本経済団体連合会（経団連）",
    description:
      "日本の主要企業約1,500社が加盟する総合経済団体。M&A環境整備に関する政策提言や税制改正要望を取りまとめ、クロスボーダーM&Aの制度設計にも影響力を持つ。",
    url: "https://www.keidanren.or.jp/",
    prefecture: "東京都",
    type: "経営者団体",
    memberCount: 1500,
    focusAreas: ["政策提言", "経済界代表", "制度設計", "クロスボーダーM&A"],
    established: 1946,
  },
  {
    id: "keizai-doyukai",
    name: "経済同友会",
    description:
      "経営者が個人資格で参加する政策提言団体。コーポレートガバナンス改革やM&A市場の透明性向上に関する提言を積極的に行う。企業価値向上と株主との対話促進を推進。",
    url: "https://www.doyukai.or.jp/",
    prefecture: "東京都",
    type: "経営者団体",
    memberCount: 1500,
    focusAreas: ["政策提言", "ガバナンス改革", "経営者交流", "企業価値向上"],
    established: 1946,
  },
  {
    id: "jcci",
    name: "日本商工会議所",
    description:
      "全国515の商工会議所を統括する中央団体。中小企業の事業承継やM&Aに関する政策提言、事業承継支援制度の推進を行う。約125万の会員事業者を有する。",
    url: "https://www.jcci.or.jp/",
    prefecture: "東京都",
    type: "経営者団体",
    memberCount: 1250000,
    focusAreas: ["中小企業支援", "事業承継", "政策提言", "経営支援"],
    established: 1922,
  },
  {
    id: "chuokai",
    name: "全国中小企業団体中央会",
    description:
      "中小企業組合の全国中央組織。組合を通じた中小企業間のM&A・事業連携を支援し、事業承継に関する情報提供やセミナーを実施。",
    url: "https://www.chuokai.or.jp/",
    prefecture: "東京都",
    type: "経営者団体",
    focusAreas: ["中小企業組合", "事業連携", "事業承継", "共同事業"],
    established: 1956,
  },
  {
    id: "jc-japan",
    name: "日本青年会議所（JC）",
    description:
      "20〜40歳の青年経済人約3万人が参加する全国組織。地域経済活性化やリーダー育成を通じて若手経営者のネットワークを構築し、事業承継の受け皿としても機能。",
    url: "https://www.jaycee.or.jp/",
    type: "経営者団体",
    memberCount: 30000,
    focusAreas: ["青年経済人", "地域活性化", "リーダー育成", "事業承継"],
    established: 1951,
  },
  {
    id: "eo-japan",
    name: "EO Japan（Entrepreneurs' Organization）",
    description:
      "年商1億円以上の起業家による国際的なネットワーク。経営者同士のピア・ラーニングとメンタリングを重視し、Exit戦略やM&Aに関する知見共有も活発。",
    url: "https://www.eojapan.org/",
    type: "経営者団体",
    memberCount: 400,
    focusAreas: ["起業家交流", "ピアラーニング", "グローバル", "Exit戦略"],
    established: 1987,
  },
  {
    id: "ypo-japan",
    name: "YPO Japan（Young Presidents' Organization）",
    description:
      "45歳以下で社長に就任した経営者の国際ネットワーク。会員制でグローバルな経営者交流の場を提供し、M&Aやクロスボーダー案件の情報交換を行う。",
    url: "https://www.ypo.org/",
    type: "経営者団体",
    memberCount: 300,
    focusAreas: ["若手経営者", "グローバル", "リーダーシップ", "M&A情報交換"],
    established: 1950,
  },
  {
    id: "tokyo-nbc",
    name: "東京ニュービジネス協議会（NBC）",
    description:
      "新規事業・イノベーションに取り組む経営者の団体。ベンチャー支援やビジネスマッチングを推進し、スタートアップのM&A/Exit機会の創出にも貢献。",
    url: "https://www.nbc-japan.org/",
    prefecture: "東京都",
    type: "経営者団体",
    memberCount: 800,
    focusAreas: ["新規事業", "イノベーション", "ベンチャー支援", "Exit機会"],
    established: 1989,
  },
  {
    id: "kansai-keizai-doyukai",
    name: "関西経済同友会",
    description:
      "関西の経営者による政策提言・経済活性化団体。関西経済圏の発展とビジネス環境整備を推進し、関西発のM&A案件形成に寄与。",
    url: "https://www.kansaidoyukai.or.jp/",
    prefecture: "大阪府",
    type: "経営者団体",
    memberCount: 1000,
    focusAreas: ["政策提言", "関西経済", "経営者交流", "地域M&A"],
    established: 1946,
  },
  {
    id: "chubu-keizai-doyukai",
    name: "中部経済同友会",
    description:
      "中部地方の経営者による経済団体。製造業を中心とした中部経済圏の企業間連携やサプライチェーン再編に伴うM&A動向に関する情報交換を実施。",
    url: "https://www.chubudoyukai.or.jp/",
    prefecture: "愛知県",
    type: "経営者団体",
    memberCount: 700,
    focusAreas: ["中部経済", "製造業連携", "サプライチェーン", "経営者交流"],
    established: 1947,
  },
  {
    id: "hokkaido-keizai-doyukai",
    name: "北海道経済同友会",
    description:
      "北海道の経営者による経済団体。北海道経済の活性化と地域企業の事業承継問題に取り組み、M&Aによる地域経済の持続可能性を研究。",
    url: "https://www.hokkaido-doyukai.jp/",
    prefecture: "北海道",
    type: "経営者団体",
    focusAreas: ["北海道経済", "地域活性化", "事業承継", "農業・観光"],
    established: 1947,
  },
  {
    id: "kyushu-keizai-doyukai",
    name: "九州経済同友会",
    description:
      "九州・沖縄の経営者による経済団体。九州経済圏の発展とアジアとの経済連携を推進し、クロスボーダーM&Aや地域企業の承継支援に取り組む。",
    prefecture: "福岡県",
    type: "経営者団体",
    focusAreas: ["九州経済", "アジア連携", "事業承継", "地域活性化"],
    established: 1946,
  },
  {
    id: "tokyo-cci",
    name: "東京商工会議所",
    description:
      "東京都内の約8万事業者が加盟する商工会議所。事業承継相談窓口やM&Aマッチング支援を提供し、中小企業の経営課題解決を総合的にサポート。",
    url: "https://www.tokyo-cci.or.jp/",
    prefecture: "東京都",
    type: "経営者団体",
    memberCount: 80000,
    focusAreas: ["事業承継", "経営相談", "ビジネスマッチング", "中小企業支援"],
    established: 1878,
  },
  {
    id: "osaka-cci",
    name: "大阪商工会議所",
    description:
      "大阪の企業・事業者を支援する総合経済団体。事業承継支援、ビジネスマッチング、M&A相談窓口を設置し、関西圏のM&A活性化に貢献。",
    url: "https://www.osaka.cci.or.jp/",
    prefecture: "大阪府",
    type: "経営者団体",
    memberCount: 30000,
    focusAreas: ["事業承継", "ビジネスマッチング", "経営支援", "関西M&A"],
    established: 1878,
  },
  {
    id: "nagoya-cci",
    name: "名古屋商工会議所",
    description:
      "中部地方最大の経済団体。事業承継相談窓口やM&Aセミナーを定期的に開催し、製造業が多い地域性を反映した産業再編支援を実施。",
    url: "https://www.nagoya-cci.or.jp/",
    prefecture: "愛知県",
    type: "経営者団体",
    memberCount: 15000,
    focusAreas: ["事業承継", "中部経済", "製造業支援", "産業再編"],
    established: 1881,
  },
  {
    id: "fukuoka-cci",
    name: "福岡商工会議所",
    description:
      "福岡地域の経済振興を担う商工会議所。スタートアップ支援やアジアとのビジネス連携を推進し、事業承継・M&Aの相談対応も充実。",
    url: "https://www.fukunet.or.jp/",
    prefecture: "福岡県",
    type: "経営者団体",
    memberCount: 16000,
    focusAreas: ["スタートアップ", "アジア連携", "事業承継", "地域経済"],
    established: 1879,
  },
  {
    id: "keieisha-jp",
    name: "経営者JP",
    description:
      "経営者・CXO層のネットワーキングと経営課題解決を支援するプラットフォーム。M&A後のPMIや経営統合に関する知見共有、経営人材のマッチングを提供。",
    url: "https://www.keieisha.jp/",
    prefecture: "東京都",
    type: "経営者団体",
    memberCount: 3000,
    focusAreas: ["経営者交流", "CXO採用", "PMI", "経営統合"],
    established: 2009,
  },

  // ============================================================
  // 業界団体 (11 entries)
  // ============================================================
  {
    id: "ma-chukai-kyokai",
    name: "M&A仲介協会",
    description:
      "M&A仲介業者の品質向上と業界の健全な発展を目的とした自主規制団体。倫理規定の策定やベストプラクティスの共有を推進し、中小M&A市場の信頼性向上に貢献。",
    url: "https://ma-chukai.or.jp/",
    prefecture: "東京都",
    type: "業界団体",
    memberCount: 100,
    focusAreas: ["M&A仲介", "業界自主規制", "品質向上", "中小M&A"],
    established: 2021,
  },
  {
    id: "jpea",
    name: "日本プライベート・エクイティ協会（JPEA）",
    description:
      "PE/バイアウトファンドの業界団体。MBO、LBO、カーブアウトなどPEによるM&A手法の普及と業界発展を推進し、投資家・金融機関との対話窓口を担う。",
    url: "https://www.jpea.jp/",
    prefecture: "東京都",
    type: "業界団体",
    memberCount: 60,
    focusAreas: ["PE投資", "バイアウト", "LBO", "カーブアウト"],
    established: 2001,
  },
  {
    id: "jvca",
    name: "日本ベンチャーキャピタル協会（JVCA）",
    description:
      "VC業界の発展を目指す業界団体。スタートアップへの投資やExit戦略としてのM&Aに関する情報交換、政策提言を行い、IPOとM&A双方のExit環境整備を推進。",
    url: "https://jvca.jp/",
    prefecture: "東京都",
    type: "業界団体",
    memberCount: 200,
    focusAreas: ["ベンチャー投資", "Exit戦略", "政策提言", "スタートアップM&A"],
    established: 2002,
  },
  {
    id: "jigyo-shoukei-center",
    name: "事業承継・引継ぎ支援センター",
    description:
      "中小企業庁が設置する公的相談窓口。後継者不在の中小企業に対して事業承継・M&Aの支援を実施。全国47都道府県に設置され、年間数万件の相談に対応。",
    url: "https://shoukei.smrj.go.jp/",
    type: "業界団体",
    focusAreas: ["事業承継", "中小企業支援", "公的支援", "M&Aマッチング"],
    established: 2011,
  },
  {
    id: "smrj",
    name: "中小企業基盤整備機構（中小機構）",
    description:
      "中小企業支援の中核的な政策実施機関。事業承継・引継ぎ支援センターの運営や事業再編支援、ファンド出資を通じて中小企業のM&Aを側面から支援。",
    url: "https://www.smrj.go.jp/",
    prefecture: "東京都",
    type: "業界団体",
    focusAreas: ["中小企業支援", "事業承継", "ファンド出資", "事業再編"],
    established: 2004,
  },
  {
    id: "ma-advisor-kyokai",
    name: "日本M&Aアドバイザー協会（JMAA）",
    description:
      "M&Aアドバイザーの資格認定と品質向上を目的とした団体。M&Aアドバイザー認定資格の付与やM&A実務研修を実施し、専門家の育成に注力。",
    url: "https://www.jma-a.org/",
    prefecture: "東京都",
    type: "業界団体",
    focusAreas: ["M&Aアドバイザー", "資格認定", "実務研修", "品質向上"],
    established: 2010,
  },
  {
    id: "nihon-buyout-kenkyujo",
    name: "日本バイアウト研究所",
    description:
      "バイアウト・MBO・LBOに関する研究と実務家の交流を目的とした組織。PE投資やレバレッジド・バイアウトの手法研究、事例分析を通じた知見の蓄積と共有を推進。",
    prefecture: "東京都",
    type: "業界団体",
    focusAreas: ["バイアウト", "MBO", "LBO", "PE投資研究"],
    established: 2005,
  },
  {
    id: "zenkoku-jigyo-shoukei",
    name: "全国事業承継推進会",
    description:
      "事業承継の推進を目的とした全国組織。後継者不在問題への対応や第三者承継（M&A）の普及啓発活動を展開し、地域金融機関との連携を強化。",
    type: "業界団体",
    focusAreas: ["事業承継推進", "第三者承継", "後継者問題", "金融機関連携"],
    established: 2015,
  },
  {
    id: "keiei-gorika-kyokai",
    name: "日本経営合理化協会",
    description:
      "経営の合理化・効率化を推進する団体。事業承継やM&Aによる経営改善に関するセミナー・研修を提供し、中堅・中小企業の経営者向け実務教育を展開。",
    url: "https://www.jmca.jp/",
    prefecture: "東京都",
    type: "業界団体",
    focusAreas: ["経営合理化", "事業承継", "経営セミナー", "中小企業教育"],
    established: 1965,
  },
  {
    id: "turnaround-managers",
    name: "ターンアラウンドマネージャー協会",
    description:
      "企業再生・事業再構築の専門家ネットワーク。経営危機に陥った企業のM&A・事業譲渡・再生計画策定を支援し、再生型M&Aの知見を蓄積。",
    prefecture: "東京都",
    type: "業界団体",
    focusAreas: ["企業再生", "事業再構築", "ターンアラウンド", "再生型M&A"],
    established: 2007,
  },

  // ============================================================
  // 勉強会 / 研究会 (9 entries)
  // ============================================================
  {
    id: "ma-forum",
    name: "M&Aフォーラム",
    description:
      "M&A研究の推進と実務家の交流を目的とした団体。定期的なセミナーや研究会を開催し、M&Aに関する知識の普及と実務能力の向上を図る。",
    url: "https://www.ma-forum.or.jp/",
    prefecture: "東京都",
    type: "勉強会",
    memberCount: 500,
    focusAreas: ["M&A研究", "実務者交流", "セミナー", "知識普及"],
    established: 2001,
  },
  {
    id: "ma-kenkyukai",
    name: "M&A研究会",
    description:
      "M&Aの理論と実務を研究する学際的な研究会。弁護士・会計士・金融機関・事業会社の実務者が参加し、最新のM&A動向や法制度の分析を行う。",
    prefecture: "東京都",
    type: "勉強会",
    focusAreas: ["M&A理論", "法制度分析", "実務研究", "学際交流"],
    established: 2003,
  },
  {
    id: "jsba",
    name: "事業承継学会",
    description:
      "事業承継に関する学術研究と実務の橋渡しを目的とした学会。中小企業の後継者問題、MBO、M&Aによる承継について理論と実践の両面から研究。",
    prefecture: "東京都",
    type: "勉強会",
    focusAreas: ["事業承継", "後継者育成", "学術研究", "MBO"],
    established: 2017,
  },
  {
    id: "japan-finance-gakkai",
    name: "日本ファイナンス学会",
    description:
      "金融・財務に関する学術研究を推進する学会。M&Aのバリュエーション、資本市場効率性、企業再編の経済効果に関する研究発表が活発に行われる。",
    url: "https://www.jfa-finance.jp/",
    type: "勉強会",
    memberCount: 1200,
    focusAreas: [
      "ファイナンス研究",
      "バリュエーション",
      "資本市場",
      "企業再編",
    ],
    established: 1993,
  },
  {
    id: "kigyou-kachi-kenkyukai",
    name: "企業価値研究会",
    description:
      "企業価値評価の理論と実務に関する研究会。DCF法、マルチプル法など各種バリュエーション手法の研究や、M&Aにおける適正な企業価値算定の議論を展開。",
    prefecture: "東京都",
    type: "勉強会",
    focusAreas: ["企業価値評価", "DCF", "バリュエーション", "適正価値"],
    established: 2008,
  },
  {
    id: "pmi-kenkyukai",
    name: "PMI研究会",
    description:
      "M&A後の統合プロセス（PMI）に特化した研究会。組織統合、システム統合、文化融合など、PMIの各フェーズにおける課題と解決策を実務者の視点から研究。",
    prefecture: "東京都",
    type: "勉強会",
    focusAreas: ["PMI", "組織統合", "システム統合", "文化融合"],
    established: 2012,
  },
  {
    id: "dd-kenkyukai",
    name: "デューデリジェンス研究会",
    description:
      "財務・法務・ビジネスDD（デューデリジェンス）の手法と実務を研究する会。M&Aにおけるリスク発見手法の高度化と、DD品質の向上を目指す。",
    prefecture: "東京都",
    type: "勉強会",
    focusAreas: ["デューデリジェンス", "財務DD", "法務DD", "リスク評価"],
    established: 2010,
  },
  {
    id: "valuation-kenkyukai",
    name: "バリュエーション研究会",
    description:
      "企業・事業のバリュエーション手法を研究する専門家の集まり。株式価値算定、無形資産評価、PPAなど、M&Aに直結するバリュエーション実務の研鑽を行う。",
    prefecture: "東京都",
    type: "勉強会",
    focusAreas: ["バリュエーション", "株式価値算定", "無形資産評価", "PPA"],
    established: 2011,
  },
  {
    id: "cg-network",
    name: "コーポレートガバナンス・ネットワーク",
    description:
      "企業統治の改善を目的とした研究者・実務家の団体。取締役会改革、買収防衛策、株主還元に関する研究と提言を行い、M&Aガバナンスの向上を推進。",
    prefecture: "東京都",
    type: "勉強会",
    focusAreas: [
      "コーポレートガバナンス",
      "取締役会改革",
      "買収防衛",
      "株主還元",
    ],
    established: 2005,
  },

  // ============================================================
  // 交流会 / ネットワーキング (9 entries)
  // ============================================================
  {
    id: "rotary-japan",
    name: "国際ロータリー日本地区",
    description:
      "経営者・専門職によるグローバルな奉仕団体。約9万人の会員がビジネスネットワーキングと社会貢献を両立し、経営者間の信頼関係がM&A案件紹介にも繋がる。",
    url: "https://rotary.org/ja",
    type: "交流会",
    memberCount: 88000,
    focusAreas: [
      "社会奉仕",
      "ビジネス交流",
      "グローバル",
      "経営者ネットワーク",
    ],
    established: 1920,
  },
  {
    id: "lions-japan",
    name: "ライオンズクラブ国際協会日本地区",
    description:
      "世界最大の奉仕団体の日本支部。経営者・専門家が集い社会貢献活動を行うとともに、地域経済界の横断的なネットワーキングの場として機能。",
    url: "https://www.lionsclubs.org/ja",
    type: "交流会",
    memberCount: 100000,
    focusAreas: ["社会奉仕", "経営者交流", "ボランティア", "地域ネットワーク"],
    established: 1952,
  },
  {
    id: "rinri-houjinkai",
    name: "倫理法人会",
    description:
      "企業倫理の実践を通じた経営者の自己研鑽と交流を目的とした全国組織。約7万社が参加し、早朝セミナーを通じた経営者同士の濃密な交流がM&A情報交換の場にもなる。",
    url: "https://www.rinri-jpn.or.jp/",
    type: "交流会",
    memberCount: 70000,
    focusAreas: ["企業倫理", "経営者交流", "早朝セミナー", "自己研鑽"],
    established: 1980,
  },
  {
    id: "bni-japan",
    name: "BNI Japan",
    description:
      "世界最大級のビジネスリファーラル組織の日本支部。毎週の定例会を通じてビジネス紹介を行い、M&Aアドバイザーや事業承継関連の専門家も多数参加。",
    url: "https://bni.jp/",
    type: "交流会",
    memberCount: 12000,
    focusAreas: [
      "ビジネスリファーラル",
      "紹介営業",
      "専門家ネットワーク",
      "定例交流",
    ],
    established: 2006,
  },
  {
    id: "chusho-kigyouka-doyukai",
    name: "中小企業家同友会",
    description:
      "中小企業経営者の自主的な学びと交流の場。全国約4.7万社が参加し、経営者同士の信頼関係構築を通じて事業承継やM&Aの相談ネットワークとしても機能。",
    url: "https://www.doyu.jp/",
    type: "交流会",
    memberCount: 47000,
    focusAreas: ["中小企業経営", "経営者学習", "事業承継", "相互支援"],
    established: 1957,
  },
  {
    id: "seiwajyuku",
    name: "盛和塾（稲盛和夫）",
    description:
      "京セラ創業者・稲盛和夫氏の経営哲学を学ぶ経営者の集まり。2019年に閉塾したが、その精神を継承する地域活動が継続。M&A後の経営理念統合に関する知見が蓄積。",
    type: "交流会",
    memberCount: 15000,
    focusAreas: ["経営哲学", "稲盛経営", "フィロソフィ", "経営理念統合"],
    established: 1983,
  },
  {
    id: "marunouchi-entrepreneur",
    name: "丸の内起業家倶楽部",
    description:
      "丸の内エリアを拠点とする起業家・経営者のコミュニティ。定期的な勉強会と交流イベントを開催し、スタートアップのM&A/Exit戦略に関する情報交換も活発。",
    prefecture: "東京都",
    type: "交流会",
    focusAreas: ["起業家交流", "スタートアップ", "Exit戦略", "丸の内"],
    established: 2010,
  },
  {
    id: "venture-keieisha-koryukai",
    name: "ベンチャー経営者交流会",
    description:
      "成長段階のベンチャー企業経営者が集うネットワーキングイベント。資金調達、IPO、M&Aなど出口戦略に関する実践的な情報交換と人脈形成を促進。",
    prefecture: "東京都",
    type: "交流会",
    focusAreas: ["ベンチャー経営", "資金調達", "IPO", "M&A Exit"],
    established: 2015,
  },
  {
    id: "nippon-new-business-koryukai",
    name: "日本ニュービジネス協議会連合会（NBK）",
    description:
      "全国のニュービジネス協議会を統括する連合組織。新規事業開発やベンチャー支援を推進し、異業種交流を通じた事業連携・M&Aの機会創出に貢献。",
    url: "https://www.nb-net.or.jp/",
    type: "交流会",
    focusAreas: ["新規事業", "異業種交流", "ベンチャー支援", "事業連携"],
    established: 1998,
  },

  // ============================================================
  // オンライン / デジタル (6 entries)
  // ============================================================
  {
    id: "ma-cloud",
    name: "M&Aクラウド",
    description:
      "買い手企業と売り手企業を直接マッチングするM&Aプラットフォーム。テクノロジーを活用した効率的なM&Aプロセスを実現し、成長企業の買収戦略を支援。",
    url: "https://macloud.jp/",
    type: "オンライン",
    focusAreas: ["M&Aマッチング", "プラットフォーム", "買収戦略", "テック活用"],
    established: 2015,
  },
  {
    id: "batonz-community",
    name: "バトンズM&Aコミュニティ",
    description:
      "M&Aプラットフォーム「バトンズ」を運営するオンラインコミュニティ。小規模M&A・事業承継の情報交換の場を提供し、個人による事業買収（サーチファンド型）も支援。",
    url: "https://batonz.jp/",
    type: "オンライン",
    focusAreas: ["小規模M&A", "事業承継", "マッチング", "個人M&A"],
    established: 2018,
  },
  {
    id: "fundbook-community",
    name: "FUNDBOOKコミュニティ",
    description:
      "M&A仲介プラットフォーム「FUNDBOOK」が運営するオンラインコミュニティ。M&A成約事例の共有や経営者向け情報提供を通じて、M&Aに関するリテラシー向上を推進。",
    url: "https://fundbook.co.jp/",
    type: "オンライン",
    focusAreas: ["M&A仲介", "事例共有", "経営者向け情報", "リテラシー向上"],
    established: 2017,
  },
  {
    id: "dimension-note",
    name: "DIMENSION NOTE",
    description:
      "経営者・起業家向けのオンラインメディア/コミュニティ。経営戦略、M&A、資金調達に関する深い洞察を提供し、経営者同士のオンライン交流を促進。",
    url: "https://dimension-inc.jp/",
    type: "オンライン",
    focusAreas: ["経営者メディア", "経営戦略", "資金調達", "オンライン交流"],
    established: 2018,
  },
  {
    id: "online-salon-ma",
    name: "M&A実務オンラインサロン",
    description:
      "M&A実務者・経営者向けのオンラインコミュニティ。事例研究、Q&A、専門家とのセッションをオンラインで提供し、地方在住者でも参加可能なM&A学習の場を提供。",
    type: "オンライン",
    focusAreas: ["M&A実務", "事例研究", "オンライン交流", "地方参加可"],
    established: 2020,
  },
  {
    id: "tranbi",
    name: "TRANBI（トランビ）",
    description:
      "国内最大級のM&Aマッチングプラットフォーム。登録ユーザー数10万人超を有し、小規模案件から中堅企業まで幅広いM&A案件のオンラインマッチングを実現。",
    url: "https://www.tranbi.com/",
    type: "オンライン",
    memberCount: 100000,
    focusAreas: [
      "M&Aマッチング",
      "オンラインプラットフォーム",
      "小規模M&A",
      "中堅企業M&A",
    ],
    established: 2011,
  },

  // ============================================================
  // 投資家コミュニティ (6 entries)
  // ============================================================
  {
    id: "cfa-japan",
    name: "日本CFA協会",
    description:
      "CFA資格保有者の日本における専門家組織。企業分析、バリュエーション、投資戦略に関する研修・交流を実施し、M&Aにおける財務分析スキルの向上を支援。",
    url: "https://www.cfasociety.org/japan/",
    prefecture: "東京都",
    type: "投資家コミュニティ",
    memberCount: 3000,
    focusAreas: ["CFA資格", "企業分析", "バリュエーション", "投資戦略"],
    established: 1999,
  },
  {
    id: "saaj",
    name: "日本証券アナリスト協会",
    description:
      "証券アナリスト資格の認定と専門家の交流を推進。企業価値評価、M&A分析、コーポレートファイナンスに関するセミナーと研修プログラムを提供。",
    url: "https://www.saa.or.jp/",
    prefecture: "東京都",
    type: "投資家コミュニティ",
    memberCount: 28000,
    focusAreas: [
      "証券分析",
      "企業価値評価",
      "コーポレートファイナンス",
      "資格認定",
    ],
    established: 1962,
  },
  {
    id: "japan-value-investors",
    name: "日本バリュー投資家クラブ",
    description:
      "バリュー投資の理論と実践を研究する投資家コミュニティ。企業の本質的価値分析、M&Aイベント投資、アクティビスト投資に関する情報交換と研究を行う。",
    type: "投資家コミュニティ",
    focusAreas: [
      "バリュー投資",
      "本質的価値分析",
      "イベント投資",
      "アクティビスト",
    ],
    established: 2010,
  },
  {
    id: "angel-investor-community",
    name: "エンジェル投資家協会",
    description:
      "スタートアップへのエンジェル投資を行う個人投資家のネットワーク。投資先のExit戦略としてM&Aに関する知見共有や、買い手企業とのマッチングイベントを開催。",
    type: "投資家コミュニティ",
    focusAreas: [
      "エンジェル投資",
      "スタートアップ支援",
      "Exit戦略",
      "投資家マッチング",
    ],
    established: 2012,
  },
  {
    id: "startup-investor-koryukai",
    name: "スタートアップ投資家交流会",
    description:
      "VC、CVC、エンジェル投資家が集う定期的な交流イベント。スタートアップM&AやExitに関する最新トレンドの共有と、投資家間のシンジケーション機会を提供。",
    prefecture: "東京都",
    type: "投資家コミュニティ",
    focusAreas: [
      "VC/CVC交流",
      "スタートアップM&A",
      "シンジケーション",
      "Exit動向",
    ],
    established: 2016,
  },
  {
    id: "search-fund-japan",
    name: "サーチファンド・ジャパン",
    description:
      "サーチファンド（個人による事業買収）の手法を日本で普及させるコミュニティ。MBA出身者や若手プロフェッショナルが中小企業のM&A・経営に挑戦する場を提供。",
    type: "投資家コミュニティ",
    focusAreas: ["サーチファンド", "個人M&A", "中小企業買収", "経営者候補"],
    established: 2019,
  },

  // ============================================================
  // 士業ネットワーク (6 entries)
  // ============================================================
  {
    id: "nichibenren-ma",
    name: "日本弁護士連合会 M&A法制委員会",
    description:
      "日弁連内のM&A法制に関する専門委員会。M&Aに関する法制度の研究・提言を行い、企業買収法制、TOB規制、株式交換・移転に関する弁護士の専門性向上を推進。",
    url: "https://www.nichibenren.or.jp/",
    prefecture: "東京都",
    type: "士業ネットワーク",
    focusAreas: ["M&A法制", "企業買収法", "TOB規制", "法制度提言"],
    established: 1949,
  },
  {
    id: "jicpa",
    name: "日本公認会計士協会",
    description:
      "公認会計士の自主規制団体。M&Aにおける財務デューデリジェンス、企業価値評価、PPA（取得価額配分）に関する実務指針の策定と専門家の品質管理を担う。",
    url: "https://jicpa.or.jp/",
    prefecture: "東京都",
    type: "士業ネットワーク",
    memberCount: 42000,
    focusAreas: ["財務DD", "企業価値評価", "PPA", "監査品質"],
    established: 1949,
  },
  {
    id: "nichizeiren",
    name: "日本税理士会連合会",
    description:
      "税理士の全国組織。M&Aにおける税務デューデリジェンス、組織再編税制、事業承継税制に関する研修・情報提供を行い、中小企業のM&A税務支援を推進。",
    url: "https://www.nichizeiren.or.jp/",
    prefecture: "東京都",
    type: "士業ネットワーク",
    memberCount: 80000,
    focusAreas: ["税務DD", "組織再編税制", "事業承継税制", "中小企業税務"],
    established: 1956,
  },
  {
    id: "jigyo-shokeishi-kyokai",
    name: "事業承継士協会",
    description:
      "事業承継に特化した専門資格「事業承継士」の認定と専門家育成を行う団体。中小企業の事業承継計画策定やM&A支援の品質向上を目指す。",
    url: "https://www.shokeishi.com/",
    type: "士業ネットワーク",
    focusAreas: ["事業承継士", "資格認定", "承継計画策定", "中小企業支援"],
    established: 2015,
  },
  {
    id: "ma-senior-expert",
    name: "M&Aシニアエキスパート認定機関",
    description:
      "日本M&Aセンターが運営するM&A専門資格の認定制度。金融機関の営業担当者やM&A実務者向けに体系的な教育プログラムを提供し、M&A人材の裾野拡大を推進。",
    type: "士業ネットワーク",
    focusAreas: ["M&A資格", "専門家育成", "金融機関向け研修", "実務者教育"],
    established: 2012,
  },
  {
    id: "fudousan-kanteishi",
    name: "日本不動産鑑定士協会連合会",
    description:
      "不動産鑑定士の全国組織。M&Aにおける不動産評価、事業用不動産の価値算定、PPA時の不動産関連の公正価値評価に関する専門知識を提供。",
    url: "https://www.fudousan-kanteishi.or.jp/",
    prefecture: "東京都",
    type: "士業ネットワーク",
    memberCount: 5000,
    focusAreas: ["不動産鑑定", "事業用不動産評価", "PPA支援", "公正価値評価"],
    established: 1970,
  },

  // ============================================================
  // アカデミア (3 entries)
  // ============================================================
  {
    id: "japan-academy-management",
    name: "日本経営学会",
    description:
      "経営学の学術研究を推進する学会。M&A戦略、組織統合、コーポレートガバナンスに関する研究発表が多数行われ、M&Aの学術的知見の蓄積に貢献。",
    url: "https://www.nippon-gakkai.jp/",
    type: "アカデミア",
    memberCount: 3000,
    focusAreas: ["経営学研究", "M&A戦略", "組織統合", "ガバナンス研究"],
    established: 1926,
  },
  {
    id: "japan-accounting-association",
    name: "日本会計研究学会",
    description:
      "会計学の学術研究を推進する学会。M&Aにおける会計処理（のれん、PPA）、企業結合会計基準に関する研究が活発で、実務と学術の橋渡しを担う。",
    type: "アカデミア",
    focusAreas: ["会計研究", "のれん会計", "企業結合", "PPA研究"],
    established: 1937,
  },
  {
    id: "fukuoka-startup-ma",
    name: "福岡スタートアップM&A研究会",
    description:
      "福岡のスタートアップエコシステムにおけるM&A/Exit戦略を研究。起業家・投資家・アドバイザーが参加し、九州発のイノベーションとM&Aの接点を探求。",
    prefecture: "福岡県",
    type: "アカデミア",
    memberCount: 40,
    focusAreas: [
      "スタートアップExit",
      "九州エコシステム",
      "起業家支援",
      "M&A研究",
    ],
    established: 2020,
  },
];

// ---- Search ----

export function searchCommunities(
  query?: string,
  prefecture?: string,
): Community[] {
  let results: Community[] = COMMUNITIES;

  if (prefecture) {
    results = results.filter((c) => c.prefecture === prefecture);
  }

  if (query && query.trim()) {
    const q = query.trim().toLowerCase();
    results = results.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.type.toLowerCase().includes(q) ||
        c.focusAreas.some((f) => f.toLowerCase().includes(q)),
    );
  }

  return results;
}

// ---- Helpers ----

export function getCommunitiesByType(type: CommunityType): Community[] {
  return COMMUNITIES.filter((c) => c.type === type);
}

export function getCommunitiesByPrefecture(prefecture: string): Community[] {
  return COMMUNITIES.filter((c) => c.prefecture === prefecture);
}

export function getAllTypes(): CommunityType[] {
  return [...new Set(COMMUNITIES.map((c) => c.type))];
}

export function getAllPrefectures(): string[] {
  return [
    ...new Set(
      COMMUNITIES.filter((c) => c.prefecture).map(
        (c) => c.prefecture as string,
      ),
    ),
  ];
}
