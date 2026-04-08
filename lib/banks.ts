// ---- Types ----

export type BankType =
  | "メガバンク"
  | "地方銀行"
  | "信託銀行"
  | "政策金融"
  | "証券会社"
  | "投資銀行"
  | "ノンバンク"
  | "信用金庫";

export interface Bank {
  id: string;
  name: string;
  type: BankType;
  description: string;
  maServices: string[];
  prefecture?: string;
  url?: string;
  totalAssets?: string;
  maTeam?: string;
}

export const BANK_TYPES: readonly BankType[] = [
  "メガバンク",
  "地方銀行",
  "信託銀行",
  "政策金融",
  "証券会社",
  "投資銀行",
  "ノンバンク",
  "信用金庫",
] as const;

// ---- Curated Bank / Financial Institution Database ----

export const BANKS: Bank[] = [
  // ============================================================
  // メガバンク (5 entries)
  // ============================================================
  {
    id: "mufg-bank",
    name: "三菱UFJ銀行",
    type: "メガバンク",
    description:
      "国内最大の商業銀行。法人営業部門を通じたM&A仲介・アドバイザリーに加え、三菱UFJモルガン・スタンレー証券との連携でフルラインのM&Aサービスを提供。LBOファイナンスでも圧倒的シェア。",
    maServices: [
      "M&Aアドバイザリー",
      "LBOファイナンス",
      "事業承継支援",
      "シンジケートローン",
      "ビジネスマッチング",
    ],
    prefecture: "東京都",
    url: "https://www.bk.mufg.jp/",
    totalAssets: "約386兆円",
    maTeam: "ソリューション本部 M&Aアドバイザリー部",
  },
  {
    id: "smbc-bank",
    name: "三井住友銀行",
    type: "メガバンク",
    description:
      "三大メガバンクの一角。M&Aアドバイザリー部門を有し、国内外のM&A案件に対応。SMBC日興証券と一体となったディールソーシングとファイナンス提供が強み。事業承継ファンドも運営。",
    maServices: [
      "M&Aアドバイザリー",
      "事業承継支援",
      "LBOファイナンス",
      "ストラクチャードファイナンス",
      "事業承継ファンド",
    ],
    prefecture: "東京都",
    url: "https://www.smbc.co.jp/",
    totalAssets: "約261兆円",
    maTeam: "コーポレートアドバイザリー本部",
  },
  {
    id: "mizuho-bank",
    name: "みずほ銀行",
    type: "メガバンク",
    description:
      "三大メガバンクの一角。みずほ証券との銀証連携によるM&Aアドバイザリーを展開し、大企業のクロスボーダーM&Aから中堅企業の事業承継まで幅広い案件に対応。産業調査力にも定評。",
    maServices: [
      "M&Aアドバイザリー",
      "事業承継支援",
      "産業調査",
      "LBOファイナンス",
      "海外M&A支援",
    ],
    prefecture: "東京都",
    url: "https://www.mizuhobank.co.jp/",
    totalAssets: "約252兆円",
    maTeam: "コーポレートファイナンス部",
  },
  {
    id: "resona-bank",
    name: "りそな銀行",
    type: "メガバンク",
    description:
      "信託機能を併せ持つ唯一のメガバンク。中堅・中小企業のM&A仲介、事業承継信託、自社株承継スキームの提供に強みを持ち、信託と銀行業務を融合したソリューションを展開。",
    maServices: [
      "M&A仲介",
      "事業承継信託",
      "自社株承継",
      "遺言信託",
      "ビジネスマッチング",
    ],
    prefecture: "東京都",
    url: "https://www.resonabank.co.jp/",
    totalAssets: "約76兆円",
    maTeam: "ソリューション営業部 事業承継・M&Aグループ",
  },
  {
    id: "smtb",
    name: "三井住友信託銀行",
    type: "信託銀行",
    description:
      "国内最大の信託銀行。信託機能を活用した事業承継スキーム（自社株信託、議決権信託等）の設計に独自の強みを持ち、M&Aアドバイザリー、不動産M&A支援にも対応。",
    maServices: [
      "事業承継信託",
      "自社株信託",
      "M&Aアドバイザリー",
      "不動産M&A",
      "議決権信託",
    ],
    prefecture: "東京都",
    url: "https://www.smtb.jp/",
    totalAssets: "約62兆円（信託財産含む約300兆円）",
    maTeam: "プライベートバンキング部 事業承継コンサルティング",
  },

  // ============================================================
  // 主要証券・投資銀行 (8 entries)
  // ============================================================
  {
    id: "nomura-sec",
    name: "野村證券",
    type: "証券会社",
    description:
      "日本最大の証券会社。投資銀行部門はM&Aアドバイザリーで国内リーグテーブル常連の上位。大型のクロスボーダーM&A、TOB、MBO案件でFAとしての豊富な実績を有する。",
    maServices: [
      "M&Aアドバイザリー（FA）",
      "公開買付代理",
      "株式引受",
      "フェアネス・オピニオン",
      "資金調達",
    ],
    prefecture: "東京都",
    url: "https://www.nomura.co.jp/",
    totalAssets: "約46兆円（顧客資産）",
    maTeam: "インベストメント・バンキング部",
  },
  {
    id: "daiwa-sec",
    name: "大和証券",
    type: "証券会社",
    description:
      "国内証券大手。M&Aアドバイザリー部門は上場企業のTOB、MBO、クロスボーダーM&Aで多数の実績。大和PIパートナーズによるPE投資機能も有し、ディール全体をカバー。",
    maServices: [
      "M&Aアドバイザリー（FA）",
      "公開買付",
      "MBOアドバイザリー",
      "PE投資",
      "IPOアドバイザリー",
    ],
    prefecture: "東京都",
    url: "https://www.daiwa.jp/",
    totalAssets: "約28兆円（顧客資産）",
    maTeam: "グローバル・インベストメント・バンキング部",
  },
  {
    id: "smbc-nikko",
    name: "SMBC日興証券",
    type: "証券会社",
    description:
      "SMBCグループの中核証券会社。三井住友銀行との銀証連携でM&Aアドバイザリーを展開し、法人顧客基盤を活かしたディールソーシングに強み。大型案件のFA実績多数。",
    maServices: [
      "M&Aアドバイザリー（FA）",
      "公開買付代理",
      "資金調達",
      "フェアネス・オピニオン",
      "事業承継支援",
    ],
    prefecture: "東京都",
    url: "https://www.smbcnikko.co.jp/",
    maTeam: "インベストメントバンキング本部",
  },
  {
    id: "mizuho-sec",
    name: "みずほ証券",
    type: "証券会社",
    description:
      "みずほフィナンシャルグループの証券会社。みずほ銀行との連携によるM&Aアドバイザリーを提供し、産業知見に基づく戦略的M&A助言を強みとする。グローバルネットワークも充実。",
    maServices: [
      "M&Aアドバイザリー（FA）",
      "公開買付",
      "クロスボーダーM&A",
      "資金調達",
      "リストラクチャリング",
    ],
    prefecture: "東京都",
    url: "https://www.mizuho-sc.com/",
    maTeam: "投資銀行部門",
  },
  {
    id: "mufg-ms-sec",
    name: "三菱UFJモルガン・スタンレー証券",
    type: "投資銀行",
    description:
      "三菱UFJとモルガン・スタンレーの合弁証券会社。グローバル投資銀行の知見と国内最大の商業銀行ネットワークを融合し、大型クロスボーダーM&Aで国内トップクラスの実績。",
    maServices: [
      "M&Aアドバイザリー（FA）",
      "クロスボーダーM&A",
      "公開買付",
      "リストラクチャリング",
      "資本市場",
    ],
    prefecture: "東京都",
    url: "https://www.sc.mufg.jp/",
    maTeam: "投資銀行本部 M&Aアドバイザリー部",
  },
  {
    id: "goldman-sachs",
    name: "ゴールドマン・サックス証券",
    type: "投資銀行",
    description:
      "世界最大級の投資銀行の日本拠点。大型クロスボーダーM&A、敵対的買収防衛、大規模リストラクチャリングにおけるFAとして日本市場でトップティアの実績。日本企業のグローバルM&Aを支援。",
    maServices: [
      "M&Aアドバイザリー（FA）",
      "敵対的買収防衛",
      "リストラクチャリング",
      "資本市場",
      "PE投資",
    ],
    prefecture: "東京都",
    url: "https://www.goldmansachs.com/japan/",
    maTeam: "投資銀行部門",
  },
  {
    id: "jpmorgan",
    name: "JPモルガン証券",
    type: "投資銀行",
    description:
      "グローバル投資銀行の日本法人。大型M&Aアドバイザリーに特化し、クロスボーダーM&A、LBO、MBOのFAとして豊富な実績。日本企業の海外買収を投資銀行の視点から戦略的に支援。",
    maServices: [
      "M&Aアドバイザリー（FA）",
      "LBOファイナンス",
      "クロスボーダーM&A",
      "資本市場",
      "リストラクチャリング",
    ],
    prefecture: "東京都",
    url: "https://www.jpmorgan.co.jp/",
    maTeam: "インベストメント・バンキング部",
  },
  {
    id: "ubs-sec",
    name: "UBS証券",
    type: "投資銀行",
    description:
      "スイス系グローバル投資銀行の日本法人。M&Aアドバイザリー、特にクロスボーダー案件やウェルスマネジメントとの連携に強み。欧州企業との日本企業のM&Aで実績を持つ。",
    maServices: [
      "M&Aアドバイザリー（FA）",
      "クロスボーダーM&A",
      "資本市場",
      "ウェルスマネジメント",
      "リサーチ",
    ],
    prefecture: "東京都",
    url: "https://www.ubs.com/jp/ja.html",
    maTeam: "インベストメント・バンク部門",
  },

  // ============================================================
  // 政策金融 (4 entries)
  // ============================================================
  {
    id: "dbj",
    name: "日本政策投資銀行（DBJ）",
    type: "政策金融",
    description:
      "政府系金融機関。成長投資ファイナンス、事業再編支援、地域活性化のためのM&Aファイナンスを提供。特に大型インフラ案件やカーブアウトのファイナンスで独自の役割を果たす。",
    maServices: [
      "M&Aファイナンス",
      "メザニンファイナンス",
      "事業再編支援",
      "エクイティ投資",
      "地域企業支援",
    ],
    prefecture: "東京都",
    url: "https://www.dbj.jp/",
    totalAssets: "約18兆円",
    maTeam: "企業金融部門",
  },
  {
    id: "jfc",
    name: "日本政策金融公庫",
    type: "政策金融",
    description:
      "中小企業・小規模事業者向け政策金融機関。事業承継に伴うM&A資金の融資制度を有し、後継者不在の中小企業の第三者承継を金融面から支援。事業承継マッチング支援も実施。",
    maServices: [
      "事業承継融資",
      "M&A資金融資",
      "事業承継マッチング",
      "創業融資",
      "経営改善支援",
    ],
    prefecture: "東京都",
    url: "https://www.jfc.go.jp/",
    totalAssets: "約28兆円（貸付金）",
    maTeam: "事業承継支援室",
  },
  {
    id: "shoko-chukin",
    name: "商工組合中央金庫（商工中金）",
    type: "政策金融",
    description:
      "中小企業組合向けの政府系金融機関。事業承継・M&Aに関する融資制度や経営支援プログラムを提供し、中小企業の第三者承継（M&A）を資金面と経営面からサポート。",
    maServices: [
      "事業承継融資",
      "M&A資金融資",
      "経営改善支援",
      "ビジネスマッチング",
      "事業再生支援",
    ],
    prefecture: "東京都",
    url: "https://www.shokochukin.co.jp/",
    totalAssets: "約12兆円",
    maTeam: "事業承継支援部",
  },
  {
    id: "jbic",
    name: "国際協力銀行（JBIC）",
    type: "政策金融",
    description:
      "日本企業の海外事業展開を金融面から支援する政策金融機関。海外M&Aに係る長期融資やリスクマネーの供給を行い、日本企業のクロスボーダーM&Aを資金面で後押し。",
    maServices: [
      "海外M&Aファイナンス",
      "海外投資融資",
      "リスクマネー供給",
      "カントリーリスク軽減",
      "プロジェクトファイナンス",
    ],
    prefecture: "東京都",
    url: "https://www.jbic.go.jp/",
    totalAssets: "約19兆円",
    maTeam: "インフラ・環境ファイナンス部門",
  },

  // ============================================================
  // 主要地方銀行 (20 entries)
  // ============================================================
  {
    id: "yokohama-bank",
    name: "横浜銀行",
    type: "地方銀行",
    description:
      "地銀最大手。神奈川県を中心にM&Aアドバイザリーサービスを展開し、中堅・中小企業の事業承継型M&Aの仲介実績が豊富。コンコルディアFGとして東日本銀行とも連携。",
    maServices: [
      "M&A仲介",
      "事業承継支援",
      "ビジネスマッチング",
      "企業評価",
      "ファイナンス",
    ],
    prefecture: "神奈川県",
    url: "https://www.boy.co.jp/",
    totalAssets: "約20兆円",
    maTeam: "ソリューション営業部 事業承継・M&Aチーム",
  },
  {
    id: "chiba-bank",
    name: "千葉銀行",
    type: "地方銀行",
    description:
      "千葉県を地盤とする有力地銀。地域密着型のM&A仲介・事業承継支援に注力し、千葉県内の中小企業の後継者問題解決を支援。広域連携による案件紹介にも取り組む。",
    maServices: [
      "M&A仲介",
      "事業承継支援",
      "ビジネスマッチング",
      "経営コンサル",
      "後継者紹介",
    ],
    prefecture: "千葉県",
    url: "https://www.chibabank.co.jp/",
    totalAssets: "約18兆円",
    maTeam: "法人コンサルティング部",
  },
  {
    id: "shizuoka-bank",
    name: "静岡銀行",
    type: "地方銀行",
    description:
      "静岡県を基盤とする有力地銀。製造業が集積する静岡県内のM&A・事業承継ニーズに対応し、専門チームによるM&Aアドバイザリーサービスを提供。海外進出支援も展開。",
    maServices: [
      "M&Aアドバイザリー",
      "事業承継支援",
      "ビジネスマッチング",
      "海外進出支援",
      "企業評価",
    ],
    prefecture: "静岡県",
    url: "https://www.shizuokabank.co.jp/",
    totalAssets: "約13兆円",
    maTeam: "ソリューション推進部 M&Aチーム",
  },
  {
    id: "fukuoka-bank",
    name: "福岡銀行",
    type: "地方銀行",
    description:
      "九州最大の地方銀行。ふくおかフィナンシャルグループの中核として九州全域のM&A・事業承継を支援。FFGのM&A専門子会社と連携し、地域企業のM&Aを総合的にサポート。",
    maServices: [
      "M&A仲介",
      "事業承継支援",
      "ビジネスマッチング",
      "LBOファイナンス",
      "地域企業支援",
    ],
    prefecture: "福岡県",
    url: "https://www.fukuokabank.co.jp/",
    totalAssets: "約21兆円",
    maTeam: "法人営業部 事業承継・M&A室",
  },
  {
    id: "hokuyou-bank",
    name: "北洋銀行",
    type: "地方銀行",
    description:
      "北海道最大の地方銀行。高齢化が進む北海道の事業承継ニーズに対応し、地域の中小企業のM&A仲介、事業承継コンサルティングに注力。道内企業の経営サポートを包括的に提供。",
    maServices: [
      "M&A仲介",
      "事業承継コンサル",
      "ビジネスマッチング",
      "経営改善支援",
      "後継者育成支援",
    ],
    prefecture: "北海道",
    url: "https://www.hokuyobank.co.jp/",
    totalAssets: "約10兆円",
    maTeam: "コンサルティング営業部",
  },
  {
    id: "hiroshima-bank",
    name: "広島銀行",
    type: "地方銀行",
    description:
      "中国地方最大の地方銀行。自動車関連産業が多い広島県内のM&A・事業承継ニーズに対応し、製造業の組織再編や事業統合に関するアドバイザリーサービスを提供。",
    maServices: [
      "M&A仲介",
      "事業承継支援",
      "組織再編アドバイス",
      "ビジネスマッチング",
      "経営支援",
    ],
    prefecture: "広島県",
    url: "https://www.hirogin.co.jp/",
    totalAssets: "約10兆円",
    maTeam: "法人営業部 事業承継チーム",
  },
  {
    id: "kyoto-bank",
    name: "京都銀行",
    type: "地方銀行",
    description:
      "京都を地盤とする有力地銀。京都の老舗企業やハイテク企業の事業承継支援に強みを持ち、文化的価値のある事業の承継にも配慮したM&Aアドバイザリーを展開。",
    maServices: [
      "M&A仲介",
      "事業承継支援",
      "ビジネスマッチング",
      "経営コンサル",
      "企業評価",
    ],
    prefecture: "京都府",
    url: "https://www.kyotobank.co.jp/",
    totalAssets: "約11兆円",
    maTeam: "法人ソリューション部",
  },
  {
    id: "gunma-bank",
    name: "群馬銀行",
    type: "地方銀行",
    description:
      "群馬県を地盤とする有力地銀。県内製造業を中心とした事業承継・M&A支援に取り組み、専門チームによる仲介サービスやM&Aアドバイザリーを提供。関東北部の広域連携も推進。",
    maServices: [
      "M&A仲介",
      "事業承継支援",
      "ビジネスマッチング",
      "経営支援",
      "企業評価",
    ],
    prefecture: "群馬県",
    url: "https://www.gunmabank.co.jp/",
    totalAssets: "約9兆円",
    maTeam: "法人コンサルティング部",
  },
  {
    id: "joyo-bank",
    name: "常陽銀行",
    type: "地方銀行",
    description:
      "茨城県を地盤とする有力地銀。めぶきフィナンシャルグループとして足利銀行と統合し、北関東エリアのM&A・事業承継支援体制を強化。地域企業間のマッチングに力を入れる。",
    maServices: [
      "M&A仲介",
      "事業承継支援",
      "ビジネスマッチング",
      "北関東連携",
      "経営改善支援",
    ],
    prefecture: "茨城県",
    url: "https://www.joyobank.co.jp/",
    totalAssets: "約11兆円",
    maTeam: "コンサルティング営業部",
  },
  {
    id: "77bank",
    name: "七十七銀行",
    type: "地方銀行",
    description:
      "宮城県を地盤とする東北最大級の地方銀行。東北地方の事業承継・M&A支援に注力し、震災復興以降の事業再編ニーズにも対応。地域金融機関との広域連携で案件発掘力を強化。",
    maServices: [
      "M&A仲介",
      "事業承継支援",
      "事業再編支援",
      "ビジネスマッチング",
      "復興関連M&A",
    ],
    prefecture: "宮城県",
    url: "https://www.77bank.co.jp/",
    totalAssets: "約10兆円",
    maTeam: "法人営業部 事業承継室",
  },
  {
    id: "hokuriku-bank",
    name: "北陸銀行",
    type: "地方銀行",
    description:
      "富山県を地盤とする北陸最大の地方銀行。ほくほくフィナンシャルグループとして北海道銀行と連携し、北陸地域の製造業・老舗企業の事業承継とM&A仲介を推進。",
    maServices: [
      "M&A仲介",
      "事業承継支援",
      "ビジネスマッチング",
      "経営コンサル",
      "老舗企業支援",
    ],
    prefecture: "富山県",
    url: "https://www.hokugin.co.jp/",
    totalAssets: "約8兆円",
    maTeam: "営業統括部 事業承継推進室",
  },
  {
    id: "yamaguchi-bank",
    name: "山口銀行",
    type: "地方銀行",
    description:
      "山口県を地盤とする地方銀行。山口フィナンシャルグループとして北九州銀行・もみじ銀行と連携し、中国・九州エリアの事業承継・M&A案件をグループ横断で支援。",
    maServices: [
      "M&A仲介",
      "事業承継支援",
      "ビジネスマッチング",
      "広域連携",
      "経営支援",
    ],
    prefecture: "山口県",
    url: "https://www.yamaguchibank.co.jp/",
    totalAssets: "約6兆円",
    maTeam: "法人ソリューション部",
  },
  {
    id: "iyo-bank",
    name: "伊予銀行",
    type: "地方銀行",
    description:
      "愛媛県を地盤とする四国最大の地方銀行。四国エリアの中堅・中小企業の事業承継支援に注力し、M&A仲介の専門チームを設置。いよぎんグループの総合力で地域企業を支援。",
    maServices: [
      "M&A仲介",
      "事業承継コンサル",
      "ビジネスマッチング",
      "経営改善支援",
      "後継者育成",
    ],
    prefecture: "愛媛県",
    url: "https://www.iyobank.co.jp/",
    totalAssets: "約7兆円",
    maTeam: "法人営業部 事業承継チーム",
  },
  {
    id: "hyakujushi-bank",
    name: "百十四銀行",
    type: "地方銀行",
    description:
      "香川県を地盤とする地方銀行。四国の中堅・中小企業のM&A仲介や事業承継に取り組み、讃岐うどん等の地域産業の承継支援にも注力。地域経済の持続的発展に貢献。",
    maServices: [
      "M&A仲介",
      "事業承継支援",
      "ビジネスマッチング",
      "地域産業承継",
      "経営支援",
    ],
    prefecture: "香川県",
    url: "https://www.114bank.co.jp/",
    totalAssets: "約5兆円",
    maTeam: "事業承継・M&A推進室",
  },
  {
    id: "juhachi-shinwa",
    name: "十八親和銀行",
    type: "地方銀行",
    description:
      "長崎県を地盤とする地方銀行。ふくおかフィナンシャルグループの一員として福岡銀行と連携し、長崎県・佐賀県の事業承継・M&Aニーズに対応。地域のネットワークを活かした案件紹介に強み。",
    maServices: [
      "M&A仲介",
      "事業承継支援",
      "FFG連携",
      "ビジネスマッチング",
      "後継者支援",
    ],
    prefecture: "長崎県",
    url: "https://www.18shinwabank.co.jp/",
    totalAssets: "約5兆円",
    maTeam: "法人営業部 事業承継室",
  },
  {
    id: "nishi-nippon-city",
    name: "西日本シティ銀行",
    type: "地方銀行",
    description:
      "福岡県を地盤とする九州有数の地方銀行。九州・山口エリアの中堅企業M&A仲介に力を入れ、専門のM&Aアドバイザリーチームを保有。地域の事業承継ニーズにきめ細かく対応。",
    maServices: [
      "M&Aアドバイザリー",
      "事業承継支援",
      "ビジネスマッチング",
      "企業評価",
      "ファイナンス",
    ],
    prefecture: "福岡県",
    url: "https://www.ncbank.co.jp/",
    totalAssets: "約11兆円",
    maTeam: "コンサルティング営業部 M&A推進グループ",
  },
  {
    id: "hachijuni-bank",
    name: "八十二銀行",
    type: "地方銀行",
    description:
      "長野県を地盤とする有力地銀。精密機器・電子部品等の製造業が多い長野県内のM&A・事業承継支援に取り組み、技術力のある中小企業の後継者問題解決を支援。",
    maServices: [
      "M&A仲介",
      "事業承継支援",
      "ビジネスマッチング",
      "製造業支援",
      "経営コンサル",
    ],
    prefecture: "長野県",
    url: "https://www.82bank.co.jp/",
    totalAssets: "約10兆円",
    maTeam: "法人ソリューション部",
  },
  {
    id: "ogaki-kyoritsu",
    name: "大垣共立銀行",
    type: "地方銀行",
    description:
      "岐阜県を地盤とする地方銀行。東海地方の中小企業の事業承継M&A支援に注力し、独自のM&A仲介体制を構築。ユニークなサービスで知られ、地域企業の課題解決に取り組む。",
    maServices: [
      "M&A仲介",
      "事業承継支援",
      "ビジネスマッチング",
      "経営支援",
      "企業評価",
    ],
    prefecture: "岐阜県",
    url: "https://www.okb.co.jp/",
    totalAssets: "約6兆円",
    maTeam: "コンサルティング営業部",
  },
  {
    id: "musashino-bank",
    name: "武蔵野銀行",
    type: "地方銀行",
    description:
      "埼玉県を地盤とする地方銀行。首都圏近郊の中堅・中小企業の事業承継・M&A支援に取り組み、都市型地銀として東京との広域連携によるM&A案件のマッチングを推進。",
    maServices: [
      "M&A仲介",
      "事業承継支援",
      "ビジネスマッチング",
      "首都圏連携",
      "経営コンサル",
    ],
    prefecture: "埼玉県",
    url: "https://www.musashinobank.co.jp/",
    totalAssets: "約5兆円",
    maTeam: "法人営業部 事業承継推進グループ",
  },
  {
    id: "suruga-bank",
    name: "スルガ銀行",
    type: "地方銀行",
    description:
      "静岡県を地盤とする地方銀行。個人・法人の多様なニーズに対応する独自のビジネスモデルで知られ、中小企業のM&A・事業承継支援にも取り組む。フィンテック連携にも積極的。",
    maServices: [
      "M&A仲介",
      "事業承継支援",
      "ビジネスマッチング",
      "フィンテック連携",
      "経営支援",
    ],
    prefecture: "静岡県",
    url: "https://www.surugabank.co.jp/",
    totalAssets: "約4兆円",
    maTeam: "法人営業部",
  },

  // ============================================================
  // 信用金庫 (5 entries)
  // ============================================================
  {
    id: "johnan-shinkin",
    name: "城南信用金庫",
    type: "信用金庫",
    description:
      "東京都・神奈川県を営業地盤とする大規模信用金庫。中小企業の事業承継・M&Aマッチング支援に積極的で「よい仕事おこしフェア」等のイベントを通じた企業間連携を推進。",
    maServices: [
      "事業承継マッチング",
      "M&A支援",
      "ビジネスマッチング",
      "経営相談",
      "創業支援",
    ],
    prefecture: "東京都",
    url: "https://www.jsbank.co.jp/",
    totalAssets: "約4.5兆円",
    maTeam: "ソリューション推進部",
  },
  {
    id: "tama-shinkin",
    name: "多摩信用金庫",
    type: "信用金庫",
    description:
      "東京都多摩地域を営業基盤とする大規模信用金庫。地域の中小企業の事業承継・M&A支援プログラムを運営し、「たましん事業承継支援センター」を設置して専門的なサポートを提供。",
    maServices: [
      "事業承継支援センター",
      "M&Aマッチング",
      "後継者紹介",
      "経営コンサル",
      "セミナー開催",
    ],
    prefecture: "東京都",
    url: "https://www.tamashin.jp/",
    totalAssets: "約2.5兆円",
    maTeam: "事業承継支援センター",
  },
  {
    id: "kyoto-chuo-shinkin",
    name: "京都中央信用金庫",
    type: "信用金庫",
    description:
      "日本最大の信用金庫。京都の中小企業・老舗企業の事業承継にきめ細かく対応し、M&Aマッチングや後継者育成支援を展開。京都ならではの伝統産業の承継支援にも取り組む。",
    maServices: [
      "事業承継支援",
      "M&Aマッチング",
      "後継者育成",
      "伝統産業承継",
      "経営支援",
    ],
    prefecture: "京都府",
    url: "https://www.chushin.co.jp/",
    totalAssets: "約3.5兆円",
    maTeam: "事業支援部 事業承継グループ",
  },
  {
    id: "hamamatsu-iwata-shinkin",
    name: "浜松いわた信用金庫",
    type: "信用金庫",
    description:
      "静岡県西部を営業基盤とする信用金庫。製造業が多い浜松地域の中小企業の事業承継・M&A支援に取り組み、ものづくり企業の技術承継を含めた総合的なサポートを提供。",
    maServices: [
      "事業承継支援",
      "M&Aマッチング",
      "ものづくり企業支援",
      "経営相談",
      "ビジネスマッチング",
    ],
    prefecture: "静岡県",
    url: "https://www.hamamatsu-iwata.jp/",
    totalAssets: "約2.8兆円",
    maTeam: "法人営業部 事業承継担当",
  },
  {
    id: "saitama-shinkin",
    name: "埼玉縣信用金庫",
    type: "信用金庫",
    description:
      "埼玉県を営業地盤とする有力信用金庫。地域密着の中小企業支援を強みとし、M&A仲介機関と連携した事業承継マッチング支援を展開。セミナーや相談会を定期的に開催。",
    maServices: [
      "事業承継支援",
      "M&A連携仲介",
      "セミナー開催",
      "経営相談",
      "ビジネスマッチング",
    ],
    prefecture: "埼玉県",
    url: "https://www.saishin.co.jp/",
    totalAssets: "約2.3兆円",
    maTeam: "経営支援部",
  },

  // ============================================================
  // ノンバンク・その他 (6 entries)
  // ============================================================
  {
    id: "orix",
    name: "オリックス",
    type: "ノンバンク",
    description:
      "国内最大級の総合金融サービス企業。PE投資、メザニンファイナンス、リース、事業投資を展開し、M&Aにおけるファイナンス提供者・投資家として幅広い案件に関与。事業承継ファンドも運営。",
    maServices: [
      "PE投資",
      "メザニンファイナンス",
      "事業承継ファンド",
      "リースバック",
      "事業投資",
    ],
    prefecture: "東京都",
    url: "https://www.orix.co.jp/",
    totalAssets: "約14兆円",
    maTeam: "事業投資部門",
  },
  {
    id: "sbi-group",
    name: "SBIホールディングス",
    type: "ノンバンク",
    description:
      "インターネット金融を軸とする総合金融グループ。SBI証券でのM&Aアドバイザリー、SBIキャピタルによるPE投資、地方銀行連合を活かした事業承継支援を展開。地方創生にも注力。",
    maServices: [
      "M&Aアドバイザリー",
      "PE投資",
      "地銀連携M&A",
      "事業承継支援",
      "ベンチャー投資",
    ],
    prefecture: "東京都",
    url: "https://www.sbigroup.co.jp/",
    totalAssets: "約10兆円",
    maTeam: "SBI地方創生推進部",
  },
  {
    id: "nihon-ma-finance",
    name: "日本M&Aセンターホールディングス",
    type: "ノンバンク",
    description:
      "M&A仲介最大手のホールディングス。中小企業M&A仲介に加え、事業承継ファイナンス、PMI支援、M&A人材育成など、M&Aに関するエコシステム全体を構築。全国の会計事務所・地銀と連携。",
    maServices: [
      "M&A仲介",
      "事業承継ファイナンス",
      "PMI支援",
      "M&A人材育成",
      "バトンズ（小規模M&A）",
    ],
    prefecture: "東京都",
    url: "https://www.nihon-ma.co.jp/",
    maTeam: "M&A仲介事業部",
  },
  {
    id: "rakuten-bank",
    name: "楽天銀行",
    type: "ノンバンク",
    description:
      "国内最大のネット銀行。法人向けビジネスローンや事業者向けサービスを展開し、EC事業者やスタートアップのM&A・資金調達ニーズに対応。楽天グループの事業シナジーを活用。",
    maServices: [
      "ビジネスローン",
      "法人口座サービス",
      "EC事業者融資",
      "グループ連携",
      "フィンテック",
    ],
    prefecture: "東京都",
    url: "https://www.rakuten-bank.co.jp/",
    totalAssets: "約10兆円",
    maTeam: "法人営業部",
  },
  {
    id: "sony-bank",
    name: "ソニー銀行",
    type: "ノンバンク",
    description:
      "ソニーフィナンシャルグループのネット銀行。外貨預金やデジタルバンキングに強みを持ち、富裕層向け資産運用サービスを展開。事業売却後のオーナーの資産管理ニーズに対応。",
    maServices: [
      "富裕層向け資産運用",
      "外貨サービス",
      "デジタルバンキング",
      "事業売却後資産管理",
      "ウェルスマネジメント",
    ],
    prefecture: "東京都",
    url: "https://moneykit.net/",
    totalAssets: "約4兆円",
    maTeam: "ウェルスマネジメント部",
  },
  {
    id: "aozora-bank",
    name: "あおぞら銀行",
    type: "ノンバンク",
    description:
      "旧日本債券信用銀行。M&Aファイナンス、LBOローン、メザニン投資に特化した法人ビジネスを展開し、PEファンド向けアクイジション・ファイナンスで高いプレゼンスを持つ。",
    maServices: [
      "LBOファイナンス",
      "メザニン投資",
      "アクイジション・ファイナンス",
      "不動産ファイナンス",
      "ストラクチャードファイナンス",
    ],
    prefecture: "東京都",
    url: "https://www.aozorabank.co.jp/",
    totalAssets: "約6兆円",
    maTeam: "スペシャリティファイナンスグループ",
  },
  {
    id: "shinsei-bank",
    name: "SBI新生銀行",
    type: "ノンバンク",
    description:
      "旧新生銀行。SBIグループ傘下入り後もM&Aファイナンス、不動産ファイナンスに強みを維持。LBOローン、プロジェクトファイナンスでPEファンドや事業会社のM&Aを資金面で支援。",
    maServices: [
      "LBOファイナンス",
      "プロジェクトファイナンス",
      "不動産ファイナンス",
      "メザニン投資",
      "ストラクチャードファイナンス",
    ],
    prefecture: "東京都",
    url: "https://www.sbishinseibank.co.jp/",
    totalAssets: "約9兆円",
    maTeam: "法人ファイナンス部",
  },
  {
    id: "daishi-hokuetsu",
    name: "第四北越銀行",
    type: "地方銀行",
    description:
      "新潟県を地盤とする地方銀行。第四銀行と北越銀行が合併して誕生し、新潟県内の中堅・中小企業の事業承継・M&A支援体制を強化。地域経済の活性化に注力。",
    maServices: [
      "M&A仲介",
      "事業承継支援",
      "ビジネスマッチング",
      "経営コンサル",
      "地域連携",
    ],
    prefecture: "新潟県",
    url: "https://www.dhbk.co.jp/",
    totalAssets: "約7兆円",
    maTeam: "法人コンサルティング部",
  },
  {
    id: "juroku-bank",
    name: "十六フィナンシャルグループ（十六銀行）",
    type: "地方銀行",
    description:
      "岐阜県・愛知県を地盤とする有力地銀。東海地方の製造業を中心とした事業承継・M&A仲介に取り組み、十六FGとしてグループ一体の総合金融サービスで地域企業を支援。",
    maServices: [
      "M&A仲介",
      "事業承継支援",
      "ビジネスマッチング",
      "東海地域連携",
      "経営支援",
    ],
    prefecture: "岐阜県",
    url: "https://www.juroku.co.jp/",
    totalAssets: "約7兆円",
    maTeam: "法人ソリューション部 M&A推進チーム",
  },
];

// ---- Search ----

export interface BankFilters {
  query?: string;
  type?: BankType;
  prefecture?: string;
  service?: string;
  hasMaTeam?: boolean;
}

export function searchBanks(
  queryOrFilters?: string | BankFilters,
  type?: BankType,
  prefecture?: string,
): Bank[] {
  const filters: BankFilters =
    typeof queryOrFilters === "object"
      ? queryOrFilters
      : { query: queryOrFilters, type, prefecture };

  let results: Bank[] = BANKS;

  if (filters.type) {
    results = results.filter((b) => b.type === filters.type);
  }

  if (filters.prefecture) {
    results = results.filter((b) => b.prefecture === filters.prefecture);
  }

  if (filters.service) {
    const sv = filters.service.toLowerCase();
    results = results.filter((b) =>
      b.maServices.some((s) => s.toLowerCase().includes(sv)),
    );
  }

  if (filters.hasMaTeam) {
    results = results.filter((b) => Boolean(b.maTeam));
  }

  if (filters.query && filters.query.trim()) {
    const q = filters.query.trim().toLowerCase();
    results = results.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.description.toLowerCase().includes(q) ||
        b.type.toLowerCase().includes(q) ||
        b.maServices.some((s) => s.toLowerCase().includes(q)) ||
        (b.maTeam && b.maTeam.toLowerCase().includes(q)),
    );
  }

  return results;
}

export function getAllMaServices(): string[] {
  const set = new Set<string>();
  for (const b of BANKS) {
    for (const s of b.maServices) set.add(s);
  }
  return Array.from(set).sort();
}

// ---- Helpers ----

export function getBanksByType(type: BankType): Bank[] {
  return BANKS.filter((b) => b.type === type);
}

export function getAllTypes(): BankType[] {
  return [...new Set(BANKS.map((b) => b.type))];
}

export function getAllPrefectures(): string[] {
  return [
    ...new Set(
      BANKS.filter((b) => b.prefecture).map((b) => b.prefecture as string),
    ),
  ];
}
