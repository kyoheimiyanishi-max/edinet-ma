// ---- Types ----

export interface PersonLink {
  label: string;
  url: string;
}

export type PersonCategory =
  | "アドバイザー"
  | "投資家"
  | "経営者"
  | "アクティビスト"
  | "専門家";

export interface Person {
  id: string;
  name: string;
  nameEn?: string;
  role: string;
  organization: string;
  description: string;
  category: PersonCategory;
  notableDeals: string[];
  links: PersonLink[];
}

export const CATEGORIES: readonly PersonCategory[] = [
  "アドバイザー",
  "投資家",
  "経営者",
  "アクティビスト",
  "専門家",
] as const;

// ---- Curated M&A People Database ----

export const MA_PEOPLE: Person[] = [
  // ============================================================
  // アドバイザー / M&A仲介 (16 entries)
  // ============================================================
  {
    id: "miyake-takumi",
    name: "三宅卓",
    nameEn: "Takumi Miyake",
    role: "代表取締役社長",
    organization: "日本M&Aセンターホールディングス",
    description:
      "日本最大のM&A仲介会社を率い、中堅・中小企業のM&A市場を開拓。事業承継型M&Aの普及に貢献し、年間800件超の成約実績を誇る。M&A仲介業界の礎を築いた人物。",
    category: "アドバイザー",
    notableDeals: [
      "年間800件以上のM&A仲介",
      "中堅・中小企業M&A市場の創出",
      "事業承継型M&Aの普及",
    ],
    links: [{ label: "日本M&Aセンター", url: "https://www.nihon-ma.co.jp/" }],
  },
  {
    id: "otsuki-masahiko",
    name: "大槻昌彦",
    nameEn: "Masahiko Otsuki",
    role: "代表取締役社長",
    organization: "M&Aキャピタルパートナーズ",
    description:
      "M&Aキャピタルパートナーズを率い、中堅・中小企業向け高品質M&A仲介サービスを展開。業界トップクラスの一人当たり生産性を実現し、レコフとの業務提携で事業基盤を拡大。",
    category: "アドバイザー",
    notableDeals: [
      "中堅企業M&A仲介多数",
      "レコフとの業務提携",
      "高単価M&Aアドバイザリー",
    ],
    links: [
      { label: "M&Aキャピタルパートナーズ", url: "https://www.ma-cp.com/" },
    ],
  },
  {
    id: "sagami-shunsaku",
    name: "佐上峻作",
    nameEn: "Shunsaku Sagami",
    role: "代表取締役社長",
    organization: "M&A総合研究所",
    description:
      "AIとDXを活用したM&Aマッチングプラットフォームを構築し、M&A仲介業界にテクノロジー革新をもたらした。創業から短期間で東証グロース市場に上場を果たした。",
    category: "アドバイザー",
    notableDeals: [
      "AI活用M&Aマッチング",
      "DX型M&A仲介モデルの構築",
      "急成長による短期上場",
    ],
    links: [{ label: "M&A総合研究所", url: "https://masouken.com/" }],
  },
  {
    id: "arai-kunihiko",
    name: "荒井邦彦",
    nameEn: "Kunihiko Arai",
    role: "代表取締役社長",
    organization: "ストライク",
    description:
      "公認会計士出身。インターネットを活用したM&Aマッチングの先駆者として、中小企業M&A仲介のデジタル化を推進。M&A Onlineを運営し業界の情報発信にも貢献。",
    category: "アドバイザー",
    notableDeals: [
      "M&A Online運営",
      "インターネット型M&Aマッチング",
      "中小企業M&A仲介多数",
    ],
    links: [{ label: "ストライク", url: "https://www.strike.co.jp/" }],
  },
  {
    id: "watanabe-tsuneo",
    name: "渡部恒郎",
    nameEn: "Tsuneo Watanabe",
    role: "マネージングディレクター",
    organization: "フーリハン・ローキー（旧GCA）",
    description:
      "GCA創業メンバーとして、日本における独立系M&Aアドバイザリーの地位を確立。クロスボーダーM&Aに強みを持ち、フーリハン・ローキーとの統合後もアジア地域のアドバイザリーを牽引。",
    category: "アドバイザー",
    notableDeals: [
      "大型クロスボーダーM&Aアドバイザリー",
      "GCA/フーリハン・ローキー統合",
      "ルネサスエレクトロニクス関連",
    ],
    links: [{ label: "Houlihan Lokey", url: "https://hl.com/" }],
  },
  {
    id: "deloitte-fas",
    name: "デロイト トーマツ ファイナンシャルアドバイザリー",
    role: "M&Aアドバイザリー部門",
    organization: "デロイト トーマツ グループ",
    description:
      "国内最大級のM&Aアドバイザリーファーム。事業再生、フォレンジック、企業価値評価等の幅広いサービスを提供し、クロスボーダーDD案件でも豊富な実績を持つ。",
    category: "アドバイザー",
    notableDeals: [
      "大型事業再生アドバイザリー",
      "グローバルM&Aアドバイザリー",
      "クロスボーダーDD",
    ],
    links: [
      {
        label: "デロイト トーマツ FA",
        url: "https://www2.deloitte.com/jp/ja/pages/about-deloitte/articles/dtfa/dtfa.html",
      },
    ],
  },
  {
    id: "kpmg-fas",
    name: "KPMG FAS",
    role: "M&Aアドバイザリー",
    organization: "KPMGジャパン",
    description:
      "Big4系FAS。財務デューデリジェンス、企業価値評価、PMI支援に強みを持つ。特にクロスボーダー案件での財務DD実績が豊富。",
    category: "アドバイザー",
    notableDeals: [
      "大型企業再編アドバイザリー",
      "クロスボーダー財務DD",
      "PMI支援",
    ],
    links: [
      {
        label: "KPMG FAS",
        url: "https://kpmg.com/jp/ja/home/services/advisory/deal-advisory.html",
      },
    ],
  },
  {
    id: "pwc-advisory",
    name: "PwCアドバイザリー",
    role: "M&Aアドバイザリー",
    organization: "PwC Japanグループ",
    description:
      "Big4系アドバイザリーファーム。ディールアドバイザリー、ビジネスリカバリー、フォレンジックなど幅広いM&A関連サービスを提供。グローバルネットワークを活用したクロスボーダー支援が強み。",
    category: "アドバイザー",
    notableDeals: ["大型M&Aアドバイザリー", "事業再生支援", "グローバルDD"],
    links: [
      {
        label: "PwCアドバイザリー",
        url: "https://www.pwc.com/jp/ja/services/deals.html",
      },
    ],
  },
  {
    id: "ey-strategy",
    name: "EYストラテジー・アンド・コンサルティング",
    role: "ストラテジー・アンド・トランザクション",
    organization: "EY Japan",
    description:
      "Big4系のM&Aアドバイザリー。戦略的M&A支援、企業価値評価、PMI支援を提供。特にテクノロジーセクターやヘルスケアセクターでの案件実績が豊富。",
    category: "アドバイザー",
    notableDeals: [
      "テクノロジーセクターM&A支援",
      "ヘルスケアM&Aアドバイザリー",
      "企業価値評価",
    ],
    links: [
      {
        label: "EY Japan",
        url: "https://www.ey.com/ja_jp/strategy-transactions",
      },
    ],
  },
  {
    id: "nomura-ib",
    name: "野村證券 投資銀行部門",
    role: "M&Aアドバイザリー",
    organization: "野村ホールディングス",
    description:
      "日本最大手の証券会社の投資銀行部門。国内M&Aリーグテーブルで常に上位を占め、大型案件のファイナンシャルアドバイザーとして圧倒的な実績を持つ。",
    category: "アドバイザー",
    notableDeals: [
      "NTTドコモ完全子会社化FA",
      "武田薬品・シャイアー買収FA",
      "国内大型再編多数",
    ],
    links: [{ label: "野村證券", url: "https://www.nomura.co.jp/" }],
  },
  {
    id: "mizuho-ib",
    name: "みずほ証券 投資銀行部門",
    role: "M&Aアドバイザリー",
    organization: "みずほフィナンシャルグループ",
    description:
      "メガバンク系証券のM&Aアドバイザリー。銀行との連携による融資付きM&Aアドバイザリーに強み。国内外の大型再編案件で豊富な実績。",
    category: "アドバイザー",
    notableDeals: [
      "大型MBO案件のFA",
      "メガバンク系ならではの融資連携型アドバイザリー",
      "公開買付FA",
    ],
    links: [{ label: "みずほ証券", url: "https://www.mizuho-sc.com/" }],
  },
  {
    id: "mufg-morgan",
    name: "三菱UFJモルガン・スタンレー証券",
    role: "M&Aアドバイザリー",
    organization: "三菱UFJフィナンシャル・グループ",
    description:
      "三菱UFJとモルガン・スタンレーの合弁による投資銀行。日本最大のメガバンクグループとグローバル投資銀行のネットワークを兼ね備え、クロスボーダーM&Aに強み。",
    category: "アドバイザー",
    notableDeals: [
      "クロスボーダーM&Aアドバイザリー",
      "大型公開買付FA",
      "資本市場案件",
    ],
    links: [
      {
        label: "三菱UFJモルガン・スタンレー証券",
        url: "https://www.sc.mufg.jp/",
      },
    ],
  },
  {
    id: "frontier-management",
    name: "フロンティア・マネジメント",
    nameEn: "Frontier Management",
    role: "M&Aアドバイザリー・経営コンサルティング",
    organization: "フロンティア・マネジメント",
    description:
      "産業再生機構出身者が設立したブティック型アドバイザリーファーム。事業再生とM&Aアドバイザリーを組み合わせた独自のサービスを提供し、中堅企業の構造改革を支援。",
    category: "アドバイザー",
    notableDeals: [
      "事業再生型M&Aアドバイザリー",
      "中堅企業の構造改革支援",
      "カーブアウト案件",
    ],
    links: [
      {
        label: "フロンティア・マネジメント",
        url: "https://www.frontier-mgmt.com/",
      },
    ],
  },
  {
    id: "igpi",
    name: "経営共創基盤（IGPI）",
    nameEn: "Industrial Growth Platform, Inc.",
    role: "経営コンサルティング・ハンズオン支援",
    organization: "IGPI",
    description:
      "産業再生機構の理念を継承し、冨山和彦氏が設立。ハンズオン型の経営支援とM&Aアドバイザリーを組み合わせ、地方のバス会社再編など独自のアプローチで企業再生を実現。",
    category: "アドバイザー",
    notableDeals: [
      "みちのりHD（地方バス会社再編）",
      "中堅企業のハンズオン経営支援",
      "事業再生・カーブアウト支援",
    ],
    links: [{ label: "IGPI", url: "https://igpi.co.jp/" }],
  },
  {
    id: "recof",
    name: "レコフ",
    role: "M&Aアドバイザリー",
    organization: "レコフ",
    description:
      "1987年設立の日本最古参のM&Aアドバイザリー企業。「MARR Online」等のM&A情報メディアも運営し、業界の情報インフラを担う存在。M&Aキャピタルパートナーズと提携。",
    category: "アドバイザー",
    notableDeals: [
      "中堅企業M&Aアドバイザリー多数",
      "MARR Online運営",
      "日本M&A市場の統計整備",
    ],
    links: [{ label: "レコフ", url: "https://www.recof.co.jp/" }],
  },
  {
    id: "daiwa-ib",
    name: "大和証券 投資銀行部門",
    role: "M&Aアドバイザリー",
    organization: "大和証券グループ本社",
    description:
      "国内大手証券のM&Aアドバイザリー。IPO主幹事としての実績を活かし、成長企業のM&A戦略立案から実行まで一貫して支援。国内M&Aリーグテーブルの常連。",
    category: "アドバイザー",
    notableDeals: [
      "大型公開買付のFA",
      "成長企業のM&A戦略支援",
      "株式交換・資本再編案件",
    ],
    links: [{ label: "大和証券", url: "https://www.daiwa.jp/" }],
  },

  // ============================================================
  // 投資家 / PE / VC (15 entries)
  // ============================================================
  {
    id: "son-masayoshi",
    name: "孫正義",
    nameEn: "Masayoshi Son",
    role: "代表取締役会長兼社長",
    organization: "ソフトバンクグループ",
    description:
      "ソフトバンクビジョンファンド（SVF）を通じた大型投資で世界のテック業界に影響力を持つ。ARM買収やSprint買収など兆円規模のM&Aを主導し、日本発のグローバル投資家として知られる。",
    category: "投資家",
    notableDeals: [
      "ARM Holdings買収（3.3兆円）",
      "Sprint買収（1.8兆円）",
      "ボーダフォン日本法人買収",
      "WeWork投資",
    ],
    links: [{ label: "ソフトバンクグループ", url: "https://group.softbank/" }],
  },
  {
    id: "sayama-nobuo",
    name: "佐山展生",
    nameEn: "Nobuo Sayama",
    role: "代表取締役",
    organization: "インテグラル",
    description:
      "日本を代表するバイアウトファンドの代表。「三方良し」の理念でMBO・事業承継案件を手掛ける。一橋大学大学院教授として後進の育成にも尽力。",
    category: "投資家",
    notableDeals: [
      "スカイマークへの投資・再生",
      "ヨウジヤマモトへの投資",
      "東京スター銀行",
    ],
    links: [{ label: "インテグラル", url: "https://www.integralkk.com/" }],
  },
  {
    id: "hara-taketo",
    name: "原丈人",
    nameEn: "Taketo Hara",
    role: "会長",
    organization: "アライアンス・フォーラム財団",
    description:
      "シリコンバレーを拠点とする実業家・投資家。「公益資本主義」を提唱し、短期利益追求型のM&Aに対する批判的視点を持つ。国連やG8でも政策提言を行う。",
    category: "投資家",
    notableDeals: [
      "デフタ・パートナーズによるテック投資",
      "光ファイバー通信技術への初期投資",
      "公益資本主義に基づく投資活動",
    ],
    links: [],
  },
  {
    id: "carlyle-japan",
    name: "カーライル・ジャパン",
    nameEn: "Carlyle Japan",
    role: "プライベートエクイティ",
    organization: "カーライル・グループ",
    description:
      "世界最大級のPEファンドの日本拠点。大企業のカーブアウトや事業承継案件に注力し、投資先企業の成長支援を通じたバリューアップに実績を持つ。",
    category: "投資家",
    notableDeals: [
      "オリオンビール買収",
      "ツバキ・ナカシマ買収",
      "ウイングアーク1st投資",
    ],
    links: [{ label: "Carlyle Japan", url: "https://www.carlyle.com/ja" }],
  },
  {
    id: "kkr-japan",
    name: "KKRジャパン",
    nameEn: "KKR Japan",
    role: "プライベートエクイティ",
    organization: "KKR（コールバーグ・クラビス・ロバーツ）",
    description:
      "世界的PEファンドの日本拠点。日立グループのカーブアウト案件など大型投資を手掛け、日本におけるPE投資市場の発展に貢献。近年は日本市場への投資を大幅に拡大。",
    category: "投資家",
    notableDeals: [
      "日立国際電気買収",
      "日立工機（現HiKOKI）買収",
      "パナソニック半導体事業カーブアウト",
      "西武ホールディングス投資",
    ],
    links: [{ label: "KKR", url: "https://www.kkr.com/" }],
  },
  {
    id: "bain-japan",
    name: "ベインキャピタル・ジャパン",
    nameEn: "Bain Capital Japan",
    role: "プライベートエクイティ",
    organization: "ベインキャピタル",
    description:
      "グローバルPEファンドの日本拠点。大型バイアウトやカーブアウト案件を多数手掛ける。東芝メモリ（現キオクシア）買収コンソーシアムへの参加で注目を集めた。",
    category: "投資家",
    notableDeals: [
      "すかいらーくMBO",
      "雪国まいたけMBO",
      "東芝メモリ（キオクシア）買収コンソーシアム参加",
      "大江戸温泉物語投資",
    ],
    links: [{ label: "Bain Capital", url: "https://www.baincapital.com/" }],
  },
  {
    id: "unison-capital",
    name: "ユニゾン・キャピタル",
    nameEn: "Unison Capital",
    role: "プライベートエクイティ",
    organization: "ユニゾン・キャピタル",
    description:
      "2000年設立の日本発の独立系PEファンド。中堅企業のバイアウトや事業承継案件に特化し、経営改善を通じた企業価値向上に実績。あきんどスシローへの投資で知名度を上げた。",
    category: "投資家",
    notableDeals: ["あきんどスシロー投資", "コメダ珈琲投資", "マクロミル投資"],
    links: [
      { label: "ユニゾン・キャピタル", url: "https://www.unisoncap.com/" },
    ],
  },
  {
    id: "jstar",
    name: "J-STAR",
    nameEn: "J-STAR",
    role: "プライベートエクイティ",
    organization: "J-STAR",
    description:
      "中小企業向けバイアウトに特化した日本の独立系PEファンド。事業承継問題を抱える中小企業への投資と経営改善支援で実績を築く。",
    category: "投資家",
    notableDeals: [
      "中小企業バイアウト多数",
      "事業承継型投資",
      "中堅企業の成長支援",
    ],
    links: [{ label: "J-STAR", url: "https://j-star.co.jp/" }],
  },
  {
    id: "polaris-capital",
    name: "ポラリス・キャピタル・グループ",
    nameEn: "Polaris Capital Group",
    role: "プライベートエクイティ",
    organization: "ポラリス・キャピタル・グループ",
    description:
      "日本の中堅企業向けPEファンド。事業承継、MBO、カーブアウト案件に注力。投資先企業への経営人材派遣と成長支援で企業価値向上を図る。",
    category: "投資家",
    notableDeals: [
      "昭和飛行機工業MBO",
      "中堅企業バイアウト多数",
      "事業承継案件",
    ],
    links: [
      {
        label: "ポラリス・キャピタル",
        url: "https://www.polaris-cg.com/",
      },
    ],
  },
  {
    id: "jip",
    name: "日本産業パートナーズ（JIP）",
    nameEn: "Japan Industrial Partners",
    role: "プライベートエクイティ",
    organization: "日本産業パートナーズ",
    description:
      "大企業のカーブアウト案件に特化した日本のPEファンド。東芝の非公開化を主導した買収コンソーシアムのリード投資家として国内外で大きな注目を集めた。",
    category: "投資家",
    notableDeals: [
      "東芝の非公開化（約2兆円、コンソーシアム主導）",
      "オリンパスの映像事業カーブアウト",
      "ソニーのPC事業（VAIO）カーブアウト",
    ],
    links: [{ label: "JIP", url: "https://www.j-ind.com/" }],
  },
  {
    id: "nakagami-koji",
    name: "中神康議",
    nameEn: "Koji Nakagami",
    role: "代表取締役",
    organization: "みさき投資",
    description:
      "「働くエンゲージメント投資」を掲げ、長期集中投資を通じた企業価値向上を目指す。経営者との建設的対話を重視するスタイルで、アクティビズムとは一線を画す。",
    category: "投資家",
    notableDeals: [
      "丸井グループ（長期エンゲージメント）",
      "LIXIL",
      "少数銘柄への集中長期投資",
    ],
    links: [],
  },
  {
    id: "advantage-partners",
    name: "アドバンテッジパートナーズ",
    nameEn: "Advantage Partners",
    role: "プライベートエクイティ",
    organization: "アドバンテッジパートナーズ",
    description:
      "1992年設立の日本における先駆的なバイアウトファンド。日本初のLBOファンドとして知られ、外食・小売・ヘルスケア等の分野で多数のバイアウト実績を持つ。",
    category: "投資家",
    notableDeals: [
      "ダイエー子会社の買収",
      "ポッカコーポレーション投資",
      "中堅企業バイアウト多数",
    ],
    links: [
      {
        label: "アドバンテッジパートナーズ",
        url: "https://www.advantagepartners.com/",
      },
    ],
  },
  {
    id: "nippon-sangyo",
    name: "日本産業推進機構（NSSK）",
    nameEn: "Nihon Sangyo Suishin Kiko",
    role: "プライベートエクイティ",
    organization: "NSSK",
    description:
      "中堅・中小企業の事業承継やカーブアウトに注力するPEファンド。日本の産業基盤を支える製造業やサービス業への投資を通じ、企業再生と成長支援を行う。",
    category: "投資家",
    notableDeals: [
      "製造業カーブアウト案件",
      "事業承継型バイアウト",
      "中堅企業の成長支援投資",
    ],
    links: [{ label: "NSSK", url: "https://www.nsskjapan.com/" }],
  },

  // ============================================================
  // アクティビスト (9 entries)
  // ============================================================
  {
    id: "murakami-yoshiaki",
    name: "村上世彰",
    nameEn: "Yoshiaki Murakami",
    role: "投資家",
    organization: "村上ファンド（旧M&Aコンサルティング）/ レノ",
    description:
      "日本における「物言う株主」の先駆者。通産省出身。コーポレートガバナンス改革を訴え、日本のM&A・株主アクティビズムの歴史を変えた。現在はレノ等を通じて投資活動を継続。",
    category: "アクティビスト",
    notableDeals: [
      "ニッポン放送株式取得",
      "阪神電気鉄道株式取得",
      "黒田電気",
      "東芝機械（現芝浦機械）",
    ],
    links: [],
  },
  {
    id: "maruki-tsuyoshi",
    name: "丸木強",
    nameEn: "Tsuyoshi Maruki",
    role: "代表取締役",
    organization: "ストラテジックキャピタル",
    description:
      "元村上ファンド幹部。企業価値向上を目的とした株主提案を積極的に行うアクティビスト投資家。政策保有株式の売却や資本効率改善を訴える提案で知られる。",
    category: "アクティビスト",
    notableDeals: [
      "世紀東急工業への株主提案",
      "極東開発工業への株主提案",
      "京阪神ビルディングへの株主提案",
      "多数の株主提案（年間10件以上）",
    ],
    links: [
      { label: "ストラテジックキャピタル", url: "https://www.stracap.jp/" },
    ],
  },
  {
    id: "city-index-elevens",
    name: "シティインデックスイレブンス",
    role: "投資会社",
    organization: "シティインデックスイレブンス",
    description:
      "旧村上ファンド系の投資会社。村上世彰氏の親族が関与するとされ、大量保有報告書を通じた株式取得で注目を集める。コスモエネルギーHDへの大量株式取得が話題に。",
    category: "アクティビスト",
    notableDeals: [
      "コスモエネルギーホールディングス大量株式取得",
      "関西スーパーマーケット",
      "東京機械製作所",
    ],
    links: [],
  },
  {
    id: "dalton-investments",
    name: "ダルトン・インベストメンツ",
    nameEn: "Dalton Investments",
    role: "Chief Investment Officer",
    organization: "ダルトン・インベストメンツ",
    description:
      "ロサンゼルス拠点のアクティビストファンド。日本株にフォーカスし、割安な中小型株への投資と株主還元強化の提案を積極的に行う。日本市場での長い投資実績を持つ。",
    category: "アクティビスト",
    notableDeals: [
      "日本中小型株への積極投資",
      "株主還元強化の提案",
      "ガバナンス改善要求",
    ],
    links: [
      {
        label: "Dalton Investments",
        url: "https://www.daltoninvestments.com/",
      },
    ],
  },
  {
    id: "valueact-japan",
    name: "バリューアクト・キャピタル",
    nameEn: "ValueAct Capital",
    role: "アクティビスト投資家",
    organization: "バリューアクト・キャピタル",
    description:
      "サンフランシスコ拠点の大手アクティビストファンド。日本市場では、オリンパスの取締役を獲得するなど建設的エンゲージメントを通じた企業変革に実績を持つ。",
    category: "アクティビスト",
    notableDeals: [
      "オリンパス（取締役派遣・経営改革支援）",
      "セブン&アイ・ホールディングス",
      "JSR",
    ],
    links: [{ label: "ValueAct Capital", url: "https://www.valueact.com/" }],
  },
  {
    id: "elliott-japan",
    name: "エリオット・マネジメント",
    nameEn: "Elliott Management",
    role: "アクティビスト投資家",
    organization: "エリオット・インベストメント・マネジメント",
    description:
      "世界最大級のアクティビストファンド。日本ではソフトバンクGに対する自社株買い要求や、大日本印刷への株主還元要求など、大型株への積極的な提案で知られる。",
    category: "アクティビスト",
    notableDeals: [
      "ソフトバンクグループへの自社株買い要求",
      "大日本印刷への株主還元要求",
      "東京ガスへの提案",
    ],
    links: [
      {
        label: "Elliott Management",
        url: "https://www.elliottmgmt.com/",
      },
    ],
  },
  {
    id: "third-point-japan",
    name: "サード・ポイント",
    nameEn: "Third Point",
    role: "アクティビスト投資家",
    organization: "サード・ポイントLLC",
    description:
      "ダニエル・ローブ率いるニューヨーク拠点のアクティビストファンド。ソニーに対する事業分離提案やセブン&アイへの提案など、日本の大企業に対する株主提案で話題を呼んだ。",
    category: "アクティビスト",
    notableDeals: [
      "ソニーへのエンターテインメント事業分離提案",
      "セブン&アイ・ホールディングスへの提案",
      "IHIへの投資",
    ],
    links: [{ label: "Third Point", url: "https://www.thirdpoint.com/" }],
  },
  {
    id: "seth-fischer",
    name: "セス・フィッシャー",
    nameEn: "Seth Fischer",
    role: "Chief Investment Officer",
    organization: "オアシス・マネジメント",
    description:
      "香港拠点のアクティビストファンドを率い、日本企業へのガバナンス改善提案を積極的に実施。任天堂やサンケン電気、富士ソフトへのキャンペーンで注目を集めた。",
    category: "アクティビスト",
    notableDeals: ["任天堂への提案", "サンケン電気", "富士ソフトへのMBO提案"],
    links: [{ label: "Oasis Management", url: "https://oasiscm.com/" }],
  },
  {
    id: "kosaka-takashi",
    name: "高坂卓志",
    nameEn: "Takashi Kosaka",
    role: "共同創業者",
    organization: "エフィッシモ・キャピタル・マネジメント",
    description:
      "旧村上ファンド出身。シンガポール拠点のアクティビストファンドを率い、東芝をはじめ日本の大企業に対する大規模株主活動で知られる。サイレント・アクティビストとも呼ばれる。",
    category: "アクティビスト",
    notableDeals: [
      "東芝（筆頭株主として経営改革要求）",
      "第一生命",
      "川崎汽船",
    ],
    links: [],
  },

  // ============================================================
  // 経営者（シリアルアクワイアラー） (10 entries)
  // ============================================================
  {
    id: "nagamori-shigenobu",
    name: "永守重信",
    nameEn: "Shigenobu Nagamori",
    role: "創業者・代表取締役会長",
    organization: "ニデック（旧日本電産）",
    description:
      "70件以上のM&Aを手掛け日本電産を世界最大のモーターメーカーに育てた連続買収の名手。買収後のPMI手法は経営学のケーススタディとしても著名で「三大精神」による経営再建で知られる。",
    category: "経営者",
    notableDeals: [
      "エマソン・エレクトリック小型モーター事業買収",
      "三菱重工業工作機械事業買収",
      "OMRON Automotive買収",
      "70件超のM&A実績",
    ],
    links: [{ label: "ニデック", url: "https://www.nidec.com/" }],
  },
  {
    id: "mikitani-hiroshi",
    name: "三木谷浩史",
    nameEn: "Hiroshi Mikitani",
    role: "代表取締役会長兼社長",
    organization: "楽天グループ",
    description:
      "楽天エコシステムの構築を目指し、国内外で積極的なM&A戦略を展開。Viber、Kobo等の海外企業買収に加え、楽天モバイル参入でも大型投資を実施。EC・フィンテック・通信の融合を推進。",
    category: "経営者",
    notableDeals: [
      "Viber Media買収（約900億円）",
      "Kobo買収（約236億円）",
      "Altiostar Networks買収",
      "楽天証券・楽天銀行等のグループ形成",
    ],
    links: [{ label: "楽天グループ", url: "https://corp.rakuten.co.jp/" }],
  },
  {
    id: "niinami-takeshi",
    name: "新浪剛史",
    nameEn: "Takeshi Niinami",
    role: "代表取締役社長",
    organization: "サントリーホールディングス",
    description:
      "ローソン社長として同社をコンビニ大手に育てた後、サントリーHD社長に就任。ビーム社買収（約1.6兆円）を主導し、日本企業による海外M&Aの代表的成功例を作った。経済同友会代表幹事も歴任。",
    category: "経営者",
    notableDeals: [
      "ビーム社買収（約1.6兆円）",
      "ローソンの成長戦略M&A",
      "サントリー食品インターナショナル上場",
    ],
    links: [{ label: "サントリーHD", url: "https://www.suntory.co.jp/" }],
  },
  {
    id: "nitori-akio",
    name: "似鳥昭雄",
    nameEn: "Akio Nitori",
    role: "代表取締役会長",
    organization: "ニトリホールディングス",
    description:
      "ニトリを一代で日本最大の家具・インテリアチェーンに成長させた経営者。島忠へのTOBではDCMとの争奪戦を制し、約2,000億円での買収を実現。製造物流小売業の一貫モデルの拡大を推進。",
    category: "経営者",
    notableDeals: ["島忠へのTOB（約2,000億円）", "36期連続増収増益の達成"],
    links: [{ label: "ニトリHD", url: "https://www.nitorihd.co.jp/" }],
  },
  {
    id: "yanai-tadashi",
    name: "柳井正",
    nameEn: "Tadashi Yanai",
    role: "代表取締役会長兼社長",
    organization: "ファーストリテイリング",
    description:
      "ユニクロを世界的アパレルブランドに育てた経営者。セオリー買収、J Brand買収、GU事業の育成など、M&Aとブランド戦略を組み合わせたグローバル展開を推進。",
    category: "経営者",
    notableDeals: [
      "セオリー買収",
      "J Brand買収",
      "コントワー・デ・コトニエ買収",
      "プリンセス・タム・タム買収",
    ],
    links: [
      {
        label: "ファーストリテイリング",
        url: "https://www.fastretailing.com/",
      },
    ],
  },
  {
    id: "maezawa-yusaku",
    name: "前澤友作",
    nameEn: "Yusaku Maezawa",
    role: "実業家・投資家",
    organization: "スタートトゥデイ（元ZOZO）",
    description:
      "ZOZOを日本最大のファッションECに育て、2019年にヤフー（現LINEヤフー）へ約4,000億円で売却。創業者による大型イグジットの代表例。宇宙旅行や新規事業など投資活動を継続。",
    category: "経営者",
    notableDeals: [
      "ZOZOのヤフーへの売却（約4,000億円）",
      "アラタナ買収",
      "スタートトゥデイ時代のEC事業拡大",
    ],
    links: [],
  },
  {
    id: "idezawa-takeshi",
    name: "出澤剛",
    nameEn: "Takeshi Idezawa",
    role: "元代表取締役社長",
    organization: "LINE（現LINEヤフー）",
    description:
      "LINE社長としてZホールディングスとの経営統合を主導し、日本最大級のIT企業グループを形成。メッセンジャーアプリからフィンテック、AI、コマースへの事業拡大をM&Aで推進。",
    category: "経営者",
    notableDeals: [
      "LINE・Zホールディングス経営統合",
      "LINE Pay推進",
      "出前館への出資・連携",
    ],
    links: [{ label: "LINEヤフー", url: "https://www.lycorp.co.jp/" }],
  },
  {
    id: "tanaka-yoshikazu",
    name: "田中良和",
    nameEn: "Yoshikazu Tanaka",
    role: "代表取締役会長兼社長",
    organization: "グリー",
    description:
      "グリーを創業しモバイルゲーム大手に育てた後、投資事業に軸足を移す。グリーベンチャーズを通じたスタートアップ投資やメタバース領域への投資を積極的に展開。",
    category: "経営者",
    notableDeals: [
      "グリーベンチャーズによるスタートアップ投資",
      "REALITY（メタバース事業）",
      "3分クッキング関連事業投資",
    ],
    links: [{ label: "グリー", url: "https://corp.gree.net/" }],
  },
  {
    id: "kasahara-kenji",
    name: "笠原健治",
    nameEn: "Kenji Kasahara",
    role: "代表取締役会長",
    organization: "MIXI（旧ミクシィ）",
    description:
      "mixiを創業し日本初の大型SNSを構築。その後モンスターストライクで復活を遂げ、近年はスポーツベッティング（チャリロト買収）やスポーツ関連事業へのM&Aを積極化。",
    category: "経営者",
    notableDeals: [
      "チャリロト買収（スポーツベッティング参入）",
      "FC東京への出資",
      "コミュニティ・スポーツ事業への投資",
    ],
    links: [{ label: "MIXI", url: "https://mixi.co.jp/" }],
  },
  {
    id: "miyasaka-manabu",
    name: "宮坂学",
    nameEn: "Manabu Miyasaka",
    role: "東京都副知事（元ヤフー社長）",
    organization: "元ヤフー（現LINEヤフー）",
    description:
      "ヤフー社長時代にZOZO買収やLINEとの経営統合を推進し、ZホールディングスによるIT企業連合の形成を主導。日本のインターネット業界における大型再編のキーパーソン。",
    category: "経営者",
    notableDeals: [
      "ZOZO買収（約4,000億円）",
      "LINE経営統合",
      "一休買収",
      "Zホールディングス形成",
    ],
    links: [],
  },

  // ============================================================
  // 専門家 / 学者 / 弁護士 (8 entries)
  // ============================================================
  {
    id: "nishimura-asahi",
    name: "西村あさひ法律事務所",
    role: "M&A法務アドバイザリー",
    organization: "西村あさひ法律事務所",
    description:
      "日本最大級の法律事務所。M&A分野では国内最多クラスの案件実績を持ち、大型敵対的買収防衛策、公開買付、クロスボーダーM&A等で法的助言を提供。企業再編の法的設計で業界をリード。",
    category: "専門家",
    notableDeals: [
      "ブルドックソース買収防衛策（最高裁判例）",
      "大型公開買付の法務アドバイザリー多数",
      "日本最大級のクロスボーダーM&A法務支援",
    ],
    links: [
      {
        label: "西村あさひ法律事務所",
        url: "https://www.nishimura.com/",
      },
    ],
  },
  {
    id: "mori-hamada",
    name: "森・濱田松本法律事務所",
    role: "M&A法務アドバイザリー",
    organization: "森・濱田松本法律事務所",
    description:
      "日本を代表する五大法律事務所の一つ。M&A・企業再編・金融規制分野に強みを持ち、特に金融機関のM&A、独禁法対応、スクイーズアウト等の複雑な法務案件で豊富な実績。",
    category: "専門家",
    notableDeals: [
      "大型金融機関再編の法務アドバイザリー",
      "独禁法審査対応",
      "スクイーズアウト・少数株主保護案件",
    ],
    links: [
      {
        label: "森・濱田松本法律事務所",
        url: "https://www.mhmjapan.com/",
      },
    ],
  },
  {
    id: "anderson-mori",
    name: "アンダーソン・毛利・友常法律事務所",
    role: "M&A法務アドバイザリー",
    organization: "アンダーソン・毛利・友常法律事務所外国法共同事業",
    description:
      "日本の五大法律事務所の一つ。クロスボーダーM&Aに特に強みを持ち、外資系企業による日本企業買収、合弁会社設立、国際的な組織再編の法務アドバイザリーで豊富な実績。",
    category: "専門家",
    notableDeals: [
      "外資系企業の対日M&A法務支援",
      "クロスボーダー合弁設立",
      "国際組織再編の法的設計",
    ],
    links: [
      {
        label: "アンダーソン・毛利・友常",
        url: "https://www.amt-law.com/",
      },
    ],
  },
  {
    id: "nagashima-ohno",
    name: "長島・大野・常松法律事務所",
    role: "M&A法務アドバイザリー",
    organization: "長島・大野・常松法律事務所",
    description:
      "日本最古参の国際的法律事務所の一つ。M&A法務の草分け的存在で、敵対的買収防衛、MBO、企業再編の法的助言に豊富な実績。海外法律事務所との広範なネットワークも強み。",
    category: "専門家",
    notableDeals: [
      "日本初のMBO案件法務支援",
      "敵対的買収防衛策の法的設計",
      "グローバルM&Aの法務アドバイザリー",
    ],
    links: [
      {
        label: "長島・大野・常松",
        url: "https://www.noandt.com/",
      },
    ],
  },
  {
    id: "yanagi-ryoichi",
    name: "柳良平",
    nameEn: "Ryoichi Yanagi",
    role: "チーフESGストラテジスト",
    organization: "アリアンツ・グローバル・インベスターズ",
    description:
      "エーザイCFO時代にROE経営・IIRC統合報告の先駆者となり、日本のコーポレートガバナンス改革を牽引。「伊藤レポート」にも貢献し、企業価値と非財務資本の関係を研究する第一人者。",
    category: "専門家",
    notableDeals: [
      "エーザイ統合報告の先進的実践",
      "伊藤レポートへの貢献",
      "ROE8%基準の普及",
    ],
    links: [],
  },
  {
    id: "miyajima-hideaki",
    name: "宮島英昭",
    nameEn: "Hideaki Miyajima",
    role: "教授",
    organization: "早稲田大学 商学学術院",
    description:
      "日本のM&A・コーポレートガバナンス研究の第一人者。日本企業のM&A行動、株式持合い解消、敵対的買収防衛策の効果等について多数の実証研究を発表。RIETIフェローとしても政策提言に貢献。",
    category: "専門家",
    notableDeals: [
      "日本のM&A市場に関する実証研究多数",
      "RIETIでのコーポレートガバナンス研究",
      "経済産業省の買収防衛策ガイドライン策定への貢献",
    ],
    links: [],
  },
  {
    id: "suzuki-kazuyuki",
    name: "鈴木一功",
    nameEn: "Kazuyuki Suzuki",
    role: "教授",
    organization: "早稲田大学大学院 経営管理研究科（ビジネススクール）",
    description:
      "企業価値評価・M&Aファイナンスの専門家。投資銀行出身の実務経験を活かし、M&Aにおけるバリュエーション手法の研究と教育に従事。『企業価値評価』等の著書で知られる。",
    category: "専門家",
    notableDeals: [
      "企業価値評価に関する研究・著作",
      "M&Aファイナンスの教育・普及",
      "実務家向けバリュエーション研修",
    ],
    links: [],
  },
  {
    id: "toyama-kazuhiko",
    name: "冨山和彦",
    nameEn: "Kazuhiko Toyama",
    role: "共同経営者（元IGPI代表）",
    organization: "日本共創プラットフォーム（JPiX）",
    description:
      "産業再生機構COOとして日本の企業再生を主導した後、IGPI（経営共創基盤）を設立。「L型経済」「G型経済」の概念を提唱し、M&Aを通じた地方産業再編の理論的支柱を担う。",
    category: "専門家",
    notableDeals: [
      "産業再生機構でのカネボウ・ダイエー等の再生",
      "みちのりHD（地方バス会社再編）",
      "日本共創プラットフォーム（JPiX）設立",
    ],
    links: [{ label: "JPiX", url: "https://jpix.or.jp/" }],
  },
];

// ---- Search ----

export function searchPeople(query?: string, category?: string): Person[] {
  let results: Person[] = MA_PEOPLE;

  if (category) {
    results = results.filter((p) => p.category === category);
  }

  if (query && query.trim()) {
    const q = query.trim().toLowerCase();
    results = results.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.nameEn && p.nameEn.toLowerCase().includes(q)) ||
        p.organization.toLowerCase().includes(q) ||
        p.role.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.notableDeals.some((d) => d.toLowerCase().includes(q)),
    );
  }

  return results;
}

// ---- Helpers ----

export function getPeopleByCategory(category: PersonCategory): Person[] {
  return MA_PEOPLE.filter((p) => p.category === category);
}

export function getAllCategories(): PersonCategory[] {
  return [...new Set(MA_PEOPLE.map((p) => p.category))];
}
