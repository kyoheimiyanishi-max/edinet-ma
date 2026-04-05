// ---- Types ----

export interface LawEntry {
  id: string;
  name: string;
  category: string;
  description: string;
  url: string;
  tags: string[];
  relatedIndustries: string[];
}

// ---- Curated M&A Laws Database ----

export const MA_LAWS: LawEntry[] = [
  // ============================================================
  // 会社法 (15 entries)
  // ============================================================
  {
    id: "company-act-stock-exchange",
    name: "株式交換（会社法第767条～）",
    category: "会社法",
    description:
      "完全親子会社関係を創設するための組織再編手法。対象会社の株主に親会社株式等を交付し、100%子会社化を実現する。上場企業の完全子会社化やグループ内再編に広く利用される。",
    url: "https://laws.e-gov.go.jp/law/417AC0000000086",
    tags: ["株式交換", "完全子会社化", "組織再編", "親子会社"],
    relatedIndustries: ["全業種"],
  },
  {
    id: "company-act-stock-transfer",
    name: "株式移転（会社法第772条～）",
    category: "会社法",
    description:
      "新たに設立する会社を完全親会社とし、既存会社を完全子会社とする組織再編手法。持株会社（ホールディングス）体制の構築に用いられ、経営統合の手段としても活用される。",
    url: "https://laws.e-gov.go.jp/law/417AC0000000086",
    tags: ["株式移転", "持株会社", "ホールディングス", "経営統合"],
    relatedIndustries: ["全業種"],
  },
  {
    id: "company-act-absorption-merger",
    name: "吸収合併（会社法第748条～）",
    category: "会社法",
    description:
      "存続会社が消滅会社の権利義務を包括的に承継する合併形態。消滅会社は解散し、その資産・負債・契約関係が存続会社に移転する。最も一般的な合併手法。",
    url: "https://laws.e-gov.go.jp/law/417AC0000000086",
    tags: ["吸収合併", "包括承継", "消滅会社", "存続会社"],
    relatedIndustries: ["全業種"],
  },
  {
    id: "company-act-consolidation-merger",
    name: "新設合併（会社法第753条～）",
    category: "会社法",
    description:
      "合併当事会社の全てが消滅し、新たに設立される会社に権利義務が承継される合併形態。対等合併のイメージ形成に有効だが、許認可の再取得が必要となるため実務では吸収合併が多い。",
    url: "https://laws.e-gov.go.jp/law/417AC0000000086",
    tags: ["新設合併", "対等合併", "組織再編", "許認可"],
    relatedIndustries: ["全業種"],
  },
  {
    id: "company-act-company-split",
    name: "会社分割（会社法第757条～）",
    category: "会社法",
    description:
      "会社の事業に関する権利義務の全部または一部を他の会社に承継させる組織再編手法。吸収分割と新設分割があり、事業ポートフォリオの再構築やカーブアウトに活用される。",
    url: "https://laws.e-gov.go.jp/law/417AC0000000086",
    tags: ["会社分割", "吸収分割", "新設分割", "カーブアウト", "事業分離"],
    relatedIndustries: ["全業種"],
  },
  {
    id: "company-act-business-transfer",
    name: "事業譲渡（会社法第467条～）",
    category: "会社法",
    description:
      "会社の事業の全部または重要な一部を他の会社に譲渡する取引。個別の資産・負債・契約を選択的に移転できるため、不要な簿外債務リスクを回避できる柔軟なM&A手法。株主総会の特別決議が必要。",
    url: "https://laws.e-gov.go.jp/law/417AC0000000086",
    tags: ["事業譲渡", "特別決議", "個別承継", "簿外債務"],
    relatedIndustries: ["全業種"],
  },
  {
    id: "company-act-share-acquisition",
    name: "株式取得・株式譲渡（会社法第127条～）",
    category: "会社法",
    description:
      "対象会社の株式を取得することで経営権を獲得するM&A手法。株式譲渡制限会社では取締役会等の承認が必要。最もシンプルなM&Aスキームとして中小企業M&Aで広く利用される。",
    url: "https://laws.e-gov.go.jp/law/417AC0000000086",
    tags: ["株式取得", "株式譲渡", "経営権取得", "譲渡制限"],
    relatedIndustries: ["全業種"],
  },
  {
    id: "company-act-new-shares",
    name: "新株発行・第三者割当増資（会社法第199条～）",
    category: "会社法",
    description:
      "新株を特定の第三者に割り当てることで資本提携・経営参画を実現する手法。希薄化による既存株主への影響が大きく、有利発行の場合は株主総会の特別決議が必要。買収防衛策としても利用される。",
    url: "https://laws.e-gov.go.jp/law/417AC0000000086",
    tags: ["新株発行", "第三者割当", "希薄化", "有利発行", "資本提携"],
    relatedIndustries: ["全業種"],
  },
  {
    id: "company-act-treasury-stock",
    name: "自己株式取得（会社法第155条～）",
    category: "会社法",
    description:
      "会社が自らの株式を取得する行為。MBO（経営陣買収）や株主還元、買収防衛策として利用される。財源規制（分配可能額）の遵守が必要で、取得方法により手続が異なる。",
    url: "https://laws.e-gov.go.jp/law/417AC0000000086",
    tags: ["自己株式", "MBO", "株主還元", "財源規制", "買収防衛"],
    relatedIndustries: ["全業種"],
  },
  {
    id: "company-act-fiduciary-duty",
    name: "取締役の善管注意義務・忠実義務（会社法第330条・355条）",
    category: "会社法",
    description:
      "取締役が会社に対して負う善管注意義務と忠実義務。M&A取引における取締役の判断はビジネス・ジャッジメント・ルールにより評価される。利益相反取引やMBOでは特に慎重な対応が求められる。",
    url: "https://laws.e-gov.go.jp/law/417AC0000000086",
    tags: [
      "善管注意義務",
      "忠実義務",
      "経営判断の原則",
      "利益相反",
      "取締役責任",
    ],
    relatedIndustries: ["全業種"],
  },
  {
    id: "company-act-derivative-suit",
    name: "株主代表訴訟（会社法第847条～）",
    category: "会社法",
    description:
      "株主が会社に代わって取締役等の責任を追及する訴訟制度。M&A取引における取締役の任務懈怠（不当な価格での売却等）に対する株主の救済手段として機能する。",
    url: "https://laws.e-gov.go.jp/law/417AC0000000086",
    tags: ["株主代表訴訟", "取締役責任", "任務懈怠", "株主の権利"],
    relatedIndustries: ["全業種"],
  },
  {
    id: "company-act-minority-rights",
    name: "少数株主の権利保護（会社法第297条等）",
    category: "会社法",
    description:
      "少数株主に認められた各種権利（株主総会招集請求権、帳簿閲覧請求権、検査役選任請求権等）。M&Aにおける少数株主の保護と支配株主による濫用の防止に重要な役割を果たす。",
    url: "https://laws.e-gov.go.jp/law/417AC0000000086",
    tags: ["少数株主", "株主権", "帳簿閲覧", "検査役", "株主保護"],
    relatedIndustries: ["全業種"],
  },
  {
    id: "company-act-squeeze-out",
    name: "特別支配株主のスクイーズアウト（会社法第179条～）",
    category: "会社法",
    description:
      "総議決権の90%以上を保有する特別支配株主が、他の株主全員に対して株式の売渡しを請求できる制度。完全子会社化の最終段階で利用され、少数株主の締出しを実現する。",
    url: "https://laws.e-gov.go.jp/law/417AC0000000086",
    tags: [
      "スクイーズアウト",
      "特別支配株主",
      "株式等売渡請求",
      "少数株主締出し",
    ],
    relatedIndustries: ["全業種"],
  },
  {
    id: "company-act-appraisal-rights",
    name: "反対株主の株式買取請求権（会社法第785条等）",
    category: "会社法",
    description:
      "組織再編に反対する株主が、公正な価格での株式買取を会社に請求できる権利。合併・会社分割・株式交換等の場面で少数株主保護の最後の砦として機能し、価格決定は裁判所が行う場合もある。",
    url: "https://laws.e-gov.go.jp/law/417AC0000000086",
    tags: ["株式買取請求権", "反対株主", "公正な価格", "価格決定"],
    relatedIndustries: ["全業種"],
  },
  {
    id: "company-act-simplified-short-form",
    name: "簡易組織再編・略式組織再編（会社法第784条等）",
    category: "会社法",
    description:
      "一定の要件を満たす場合に株主総会決議を省略できる制度。簡易組織再編は対価が純資産の20%以下の場合、略式組織再編は90%以上の議決権を保有する場合に利用でき、M&A手続の迅速化に寄与する。",
    url: "https://laws.e-gov.go.jp/law/417AC0000000086",
    tags: ["簡易組織再編", "略式組織再編", "株主総会省略", "手続簡素化"],
    relatedIndustries: ["全業種"],
  },
  {
    id: "company-act-organizational-change",
    name: "組織変更（会社法第743条～）",
    category: "会社法",
    description:
      "株式会社から持分会社への変更、またはその逆の組織形態の変更。M&Aの一環としてグループ再編や事業構造の最適化のために利用されることがある。総株主の同意が原則として必要。",
    url: "https://laws.e-gov.go.jp/law/417AC0000000086",
    tags: ["組織変更", "持分会社", "株式会社", "合同会社"],
    relatedIndustries: ["全業種"],
  },
  {
    id: "company-act-shareholder-resolution",
    name: "株主総会決議要件（会社法第309条）",
    category: "会社法",
    description:
      "M&A関連の重要事項は株主総会の特別決議（出席議決権の2/3以上）を要する。合併・会社分割・事業譲渡・定款変更等が対象。特殊決議が必要な場合もあり、決議要件の充足はM&A実行の前提条件となる。",
    url: "https://laws.e-gov.go.jp/law/417AC0000000086",
    tags: ["株主総会", "特別決議", "普通決議", "議決権", "定足数"],
    relatedIndustries: ["全業種"],
  },

  // ============================================================
  // 金融商品取引法 (10 entries)
  // ============================================================
  {
    id: "fiel-tob",
    name: "公開買付制度（金融商品取引法第27条の2～）",
    category: "金融商品取引法",
    description:
      "上場会社の株式等を市場外で一定割合以上取得する場合に義務付けられるTOB（公開買付）手続。買付価格・期間・条件等の開示義務があり、対象会社は意見表明報告書を提出する。敵対的買収にも利用される。",
    url: "https://laws.e-gov.go.jp/law/323AC0000000025",
    tags: ["公開買付", "TOB", "買付価格", "意見表明", "強制公開買付"],
    relatedIndustries: ["上場企業", "金融", "証券"],
  },
  {
    id: "fiel-large-shareholding",
    name: "大量保有報告制度（金融商品取引法第27条の23～）",
    category: "金融商品取引法",
    description:
      "上場会社の株券等を5%超保有した場合に大量保有報告書の提出を義務付ける制度（5%ルール）。保有割合が1%以上変動した場合は変更報告書が必要。M&Aにおける株式取得の透明性を確保する。",
    url: "https://laws.e-gov.go.jp/law/323AC0000000025",
    tags: ["5%ルール", "大量保有報告", "変更報告書", "特例報告", "共同保有者"],
    relatedIndustries: ["上場企業", "金融", "証券"],
  },
  {
    id: "fiel-insider-trading",
    name: "インサイダー取引規制（金融商品取引法第166条～）",
    category: "金融商品取引法",
    description:
      "上場会社の重要事実（M&A計画、業績予想の修正等）を知った会社関係者等が、公表前に株式等の売買を行うことを禁止する規制。M&Aプロセスでは情報管理体制の構築が不可欠。",
    url: "https://laws.e-gov.go.jp/law/323AC0000000025",
    tags: ["インサイダー取引", "重要事実", "情報管理", "未公表", "課徴金"],
    relatedIndustries: ["上場企業", "金融", "証券"],
  },
  {
    id: "fiel-disclosure",
    name: "開示制度・有価証券報告書（金融商品取引法第24条～）",
    category: "金融商品取引法",
    description:
      "上場企業等に義務付けられる継続開示制度。有価証券報告書・四半期報告書・臨時報告書等を通じて企業情報を開示する。M&Aのデューデリジェンスにおける重要な情報源であり、重要事象の適時開示も求められる。",
    url: "https://laws.e-gov.go.jp/law/323AC0000000025",
    tags: ["有価証券報告書", "継続開示", "臨時報告書", "適時開示", "EDINET"],
    relatedIndustries: ["上場企業", "金融"],
  },
  {
    id: "fiel-mbo",
    name: "MBO規制（金融商品取引法・東証規則）",
    category: "金融商品取引法",
    description:
      "経営陣が参加する買収（MBO）に関する規制。経営陣と一般株主の間の利益相反に対処するため、独立した第三者委員会の設置、フェアネス・オピニオンの取得等の公正性担保措置が求められる。",
    url: "https://laws.e-gov.go.jp/law/323AC0000000025",
    tags: ["MBO", "経営陣買収", "利益相反", "第三者委員会", "公正性担保"],
    relatedIndustries: ["上場企業", "金融"],
  },
  {
    id: "fiel-market-trading",
    name: "市場内取引規制（金融商品取引法第159条～）",
    category: "金融商品取引法",
    description:
      "証券市場における相場操縦・風説の流布等の不公正取引を禁止する規制。M&Aに関連する株式取得においても、市場での取引行為が相場操縦に該当しないよう注意が必要。",
    url: "https://laws.e-gov.go.jp/law/323AC0000000025",
    tags: ["相場操縦", "不公正取引", "風説の流布", "市場取引"],
    relatedIndustries: ["上場企業", "金融", "証券"],
  },
  {
    id: "fiel-qualified-investor",
    name: "特定投資家制度（金融商品取引法第2条第31項）",
    category: "金融商品取引法",
    description:
      "投資家を特定投資家（プロ）と一般投資家に区分し、特定投資家に対する金融商品取引業者の行為規制を緩和する制度。M&Aアドバイザリーやファンド組成における投資家適格性の判断に関連する。",
    url: "https://laws.e-gov.go.jp/law/323AC0000000025",
    tags: ["特定投資家", "プロ投資家", "適格機関投資家", "行為規制"],
    relatedIndustries: ["金融", "ファンド", "証券"],
  },
  {
    id: "fiel-offering-disclosure",
    name: "発行開示制度（金融商品取引法第4条～）",
    category: "金融商品取引法",
    description:
      "有価証券の募集・売出しに際して有価証券届出書の提出を義務付ける制度。M&Aにおける株式対価の交付や新株発行を伴うスキームでは発行開示規制への対応が必要となる。",
    url: "https://laws.e-gov.go.jp/law/323AC0000000025",
    tags: ["発行開示", "有価証券届出書", "募集", "売出し", "目論見書"],
    relatedIndustries: ["上場企業", "金融"],
  },
  {
    id: "fiel-fair-disclosure",
    name: "フェア・ディスクロージャー・ルール（金融商品取引法第27条の36～）",
    category: "金融商品取引法",
    description:
      "上場企業が特定の第三者に未公表の重要情報を提供した場合、速やかに他の投資者にも同等の情報を公表することを義務付けるルール。M&Aにおける情報管理と選択的開示の制限に関連する。",
    url: "https://laws.e-gov.go.jp/law/323AC0000000025",
    tags: ["フェア・ディスクロージャー", "選択的開示", "情報管理", "公平開示"],
    relatedIndustries: ["上場企業", "金融", "証券"],
  },
  {
    id: "fiel-investment-advisory",
    name: "投資助言業・投資運用業（金融商品取引法第28条～）",
    category: "金融商品取引法",
    description:
      "M&Aアドバイザリー業務のうち、有価証券の価値等に関する助言が投資助言業に該当する可能性がある。FA（フィナンシャル・アドバイザー）業務との境界整理が重要で、登録義務の有無を判断する必要がある。",
    url: "https://laws.e-gov.go.jp/law/323AC0000000025",
    tags: ["投資助言業", "投資運用業", "FA", "M&Aアドバイザリー", "登録"],
    relatedIndustries: ["金融", "コンサルティング"],
  },

  // ============================================================
  // 独占禁止法・競争法 (8 entries)
  // ============================================================
  {
    id: "antimonopoly-merger-control",
    name: "企業結合規制（独占禁止法第15条～）",
    category: "独占禁止法",
    description:
      "合併・株式取得・事業譲受け等の企業結合が一定の取引分野における競争を実質的に制限する場合に禁止する規制。公正取引委員会が競争への影響を審査し、問題解消措置を求める場合がある。",
    url: "https://laws.e-gov.go.jp/law/322AC0000000054",
    tags: ["企業結合", "競争制限", "公正取引委員会", "問題解消措置"],
    relatedIndustries: ["全業種"],
  },
  {
    id: "antimonopoly-prior-notification",
    name: "企業結合の事前届出制度（独占禁止法第15条の2等）",
    category: "独占禁止法",
    description:
      "国内売上高合計額が一定基準を超える企業結合について、公正取引委員会への事前届出を義務付ける制度。届出後30日間の待機期間があり、審査期間の延長もあり得る。届出なしの実行は違法となる。",
    url: "https://laws.e-gov.go.jp/law/322AC0000000054",
    tags: ["事前届出", "待機期間", "届出基準", "審査期間", "ガンジャンピング"],
    relatedIndustries: ["全業種"],
  },
  {
    id: "antimonopoly-cartel",
    name: "不当な取引制限・カルテル規制（独占禁止法第3条・第2条第6項）",
    category: "独占禁止法",
    description:
      "事業者間の競争制限的な合意（カルテル・入札談合等）を禁止する規制。M&Aの統合過程で競合他社との情報交換がカルテルと認定されるリスクがあり、クリーンチーム等の情報遮断措置が必要。",
    url: "https://laws.e-gov.go.jp/law/322AC0000000054",
    tags: ["カルテル", "不当な取引制限", "入札談合", "クリーンチーム"],
    relatedIndustries: ["全業種"],
  },
  {
    id: "antimonopoly-private-monopolization",
    name: "私的独占の禁止（独占禁止法第3条・第2条第5項）",
    category: "独占禁止法",
    description:
      "市場支配力を有する事業者が、排除型・支配型の行為により競争を制限することを禁止する規制。M&Aによる市場シェア拡大が私的独占に該当する可能性があり、統合後の市場行動にも注意が必要。",
    url: "https://laws.e-gov.go.jp/law/322AC0000000054",
    tags: ["私的独占", "排除型", "支配型", "市場支配力"],
    relatedIndustries: ["全業種"],
  },
  {
    id: "antimonopoly-abuse-of-dominance",
    name: "優越的地位の濫用（独占禁止法第2条第9項第5号）",
    category: "独占禁止法",
    description:
      "取引上の優越的地位を利用して取引先に不当な不利益を課す行為を規制。M&A後の取引先との関係再構築において、統合企業が優越的地位を濫用しないよう注意が必要。課徴金の対象となる。",
    url: "https://laws.e-gov.go.jp/law/322AC0000000054",
    tags: ["優越的地位の濫用", "不公正な取引方法", "取引先", "課徴金"],
    relatedIndustries: ["小売", "製造業", "IT"],
  },
  {
    id: "subcontract-act",
    name: "下請代金支払遅延等防止法（下請法）",
    category: "独占禁止法",
    description:
      "親事業者と下請事業者の取引の公正化を図る法律。M&A後の取引先管理において、下請法上の義務（書面交付、支払期日遵守等）を遵守する必要がある。違反には勧告・公表の制裁がある。",
    url: "https://laws.e-gov.go.jp/law/331AC0000000120",
    tags: ["下請法", "親事業者", "下請事業者", "書面交付義務", "PMI"],
    relatedIndustries: ["製造業", "IT", "建設"],
  },
  {
    id: "antimonopoly-extraterritorial",
    name: "独占禁止法の域外適用",
    category: "独占禁止法",
    description:
      "日本市場に影響を与える外国事業者間の企業結合にも独占禁止法が適用される。クロスボーダーM&Aにおいては日本の公正取引委員会への届出義務の有無を確認する必要がある。",
    url: "https://laws.e-gov.go.jp/law/322AC0000000054",
    tags: ["域外適用", "クロスボーダー", "国際M&A", "届出義務"],
    relatedIndustries: ["全業種"],
  },
  {
    id: "antimonopoly-gun-jumping",
    name: "ガンジャンピング規制（独占禁止法・企業結合ガイドライン）",
    category: "独占禁止法",
    description:
      "企業結合の届出前または審査完了前に事実上の統合行為を行うことを禁止する規制。クロージング前の競合情報の共有や事業運営への介入は違法となるリスクがあり、統合プロセスの管理が重要。",
    url: "https://laws.e-gov.go.jp/law/322AC0000000054",
    tags: ["ガンジャンピング", "統合前行為", "待機期間", "情報遮断"],
    relatedIndustries: ["全業種"],
  },

  // ============================================================
  // 税法 (12 entries)
  // ============================================================
  {
    id: "tax-reorganization",
    name: "組織再編税制（法人税法第62条の2～）",
    category: "税法",
    description:
      "適格組織再編成における課税繰延べの要件を規定。適格要件（事業関連性、事業規模、経営参画等）を満たす場合、資産の簿価移転が認められ含み損益への課税が繰り延べられる。M&Aスキーム設計の根幹。",
    url: "https://laws.e-gov.go.jp/law/340AC0000000034",
    tags: [
      "適格組織再編",
      "非適格組織再編",
      "課税繰延",
      "簿価移転",
      "時価移転",
    ],
    relatedIndustries: ["全業種"],
  },
  {
    id: "tax-goodwill",
    name: "のれんの税務（法人税法第62条の8）",
    category: "税法",
    description:
      "非適格合併等で生じる資産調整勘定（税務上ののれん）は5年間で均等償却が可能。税務上の損金算入によるタックスメリットがM&Aの買収価格やスキーム選択に大きな影響を与える。",
    url: "https://laws.e-gov.go.jp/law/340AC0000000034",
    tags: ["のれん", "資産調整勘定", "償却", "損金算入", "買収価格"],
    relatedIndustries: ["全業種"],
  },
  {
    id: "tax-stock-exchange",
    name: "株式交換・株式移転の税務（法人税法・所得税法）",
    category: "税法",
    description:
      "適格株式交換・株式移転の場合、株主に対する課税が繰り延べられる。非適格の場合はみなし配当課税や株式譲渡益課税が発生する。完全子会社化スキームの税務コストを左右する重要論点。",
    url: "https://laws.e-gov.go.jp/law/340AC0000000034",
    tags: ["株式交換税務", "株式移転税務", "みなし配当", "課税繰延"],
    relatedIndustries: ["全業種"],
  },
  {
    id: "tax-business-transfer",
    name: "事業譲渡の税務",
    category: "税法",
    description:
      "事業譲渡は個別資産の売買として扱われ、譲渡会社には譲渡益課税、取得会社には取得資産の時価取得となる。消費税の課税対象取引も含まれ、組織再編税制の適格要件の適用がないため、税務コストが高くなる場合がある。",
    url: "https://laws.e-gov.go.jp/law/340AC0000000034",
    tags: ["事業譲渡税務", "譲渡益課税", "時価取得", "消費税"],
    relatedIndustries: ["全業種"],
  },
  {
    id: "tax-financial-income",
    name: "金融所得課税制度（所得税法・租税特別措置法）",
    category: "税法",
    description:
      "株式等の譲渡益・配当に対する申告分離課税（20.315%）を規定。M&Aにおける個人株主のエグジット時の税率に直結する。上場株式と非上場株式で税務上の取扱いが異なる点に留意が必要。",
    url: "https://laws.e-gov.go.jp/law/340AC0000000033",
    tags: ["金融所得課税", "申告分離課税", "株式譲渡益", "配当課税", "20.315%"],
    relatedIndustries: ["全業種"],
  },
  {
    id: "tax-consolidated",
    name: "連結納税制度（旧制度）・グループ通算制度（法人税法第64条の9～）",
    category: "税法",
    description:
      "2022年4月からグループ通算制度に移行。完全支配関係にある企業グループ内の損益通算を認める制度。M&Aによるグループ形成後の税務戦略に影響し、繰越欠損金の引継制限等の規制がある。",
    url: "https://laws.e-gov.go.jp/law/340AC0000000034",
    tags: ["グループ通算", "連結納税", "損益通算", "繰越欠損金", "完全支配"],
    relatedIndustries: ["全業種"],
  },
  {
    id: "tax-haven",
    name: "タックスヘイブン対策税制（租税特別措置法第66条の6～）",
    category: "税法",
    description:
      "軽課税国の外国子会社等の所得を日本の親会社の所得に合算して課税する制度（CFC税制）。クロスボーダーM&Aにおけるストラクチャリングや、買収先の海外子会社の税務リスク評価に重要。",
    url: "https://laws.e-gov.go.jp/law/332AC0000000026",
    tags: [
      "タックスヘイブン",
      "CFC税制",
      "合算課税",
      "軽課税国",
      "ペーパーカンパニー",
    ],
    relatedIndustries: ["全業種"],
  },
  {
    id: "tax-transfer-pricing",
    name: "移転価格税制（租税特別措置法第66条の4～）",
    category: "税法",
    description:
      "関連企業間の国際取引について独立企業間価格での取引を求める制度。クロスボーダーM&A後のグループ内取引の価格設定に影響し、移転価格文書化義務の対応も必要となる。",
    url: "https://laws.e-gov.go.jp/law/332AC0000000026",
    tags: ["移転価格", "独立企業間価格", "APA", "文書化義務", "国際課税"],
    relatedIndustries: ["全業種"],
  },
  {
    id: "tax-stamp",
    name: "印紙税法",
    category: "税法",
    description:
      "M&A関連の契約書（事業譲渡契約書、合併契約書等）に課される印紙税を規定。契約金額に応じた税額が発生し、大型M&Aでは数十万円以上の印紙税負担となる場合がある。電子契約は非課税。",
    url: "https://laws.e-gov.go.jp/law/342AC0000000023",
    tags: ["印紙税", "契約書", "事業譲渡契約", "合併契約", "電子契約"],
    relatedIndustries: ["全業種"],
  },
  {
    id: "tax-registration",
    name: "登録免許税法",
    category: "税法",
    description:
      "合併・会社分割等の組織再編に伴う登記（設立・変更・抹消等）に課される登録免許税を規定。不動産移転を伴うM&Aでは不動産の所有権移転登記にかかる登録免許税も発生する。",
    url: "https://laws.e-gov.go.jp/law/342AC0000000035",
    tags: ["登録免許税", "登記", "不動産移転", "合併登記", "設立登記"],
    relatedIndustries: ["全業種", "不動産"],
  },
  {
    id: "tax-share-transfer-gain",
    name: "株式譲渡益課税（所得税法第33条・法人税法第22条）",
    category: "税法",
    description:
      "株式譲渡による譲渡益に対する課税。個人は申告分離課税（20.315%）、法人は総合課税。M&Aにおける売主の手取額に直接影響し、スキーム選択（株式譲渡か事業譲渡か）の重要な判断要素となる。",
    url: "https://laws.e-gov.go.jp/law/340AC0000000033",
    tags: ["株式譲渡益", "キャピタルゲイン", "申告分離", "売主税務"],
    relatedIndustries: ["全業種"],
  },
  {
    id: "tax-special-measures",
    name: "租税特別措置法（M&A関連優遇措置）",
    category: "税法",
    description:
      "特定のM&Aスキームに対する税制優遇措置を規定。エンジェル税制（スタートアップ投資減税）、オープンイノベーション促進税制（一定のM&A投資の25%損金算入）等を含み、政策的に推奨されるM&Aを税制面で支援する。",
    url: "https://laws.e-gov.go.jp/law/332AC0000000026",
    tags: [
      "エンジェル税制",
      "オープンイノベーション促進税制",
      "税制優遇",
      "投資減税",
    ],
    relatedIndustries: ["全業種", "スタートアップ"],
  },

  // ============================================================
  // 労働法 (5 entries)
  // ============================================================
  {
    id: "labor-succession-act",
    name: "労働契約承継法（会社分割に伴う労働契約の承継等に関する法律）",
    category: "労働法",
    description:
      "会社分割時の労働者保護を規定する特別法。分割に伴う労働契約の承継手続、労働者への事前通知（分割の効力発生日の2週間前まで）、異議申立手続等を定める。労使協議の実施も義務付けられる。",
    url: "https://laws.e-gov.go.jp/law/412AC0000000103",
    tags: ["労働契約承継", "会社分割", "労働者保護", "事前通知", "異議申立"],
    relatedIndustries: ["全業種"],
  },
  {
    id: "labor-business-succession",
    name: "事業承継時の労働契約の取扱い（民法第625条・労働契約法）",
    category: "労働法",
    description:
      "事業譲渡の場合、労働契約は自動的に承継されず、個別の労働者の同意が必要。合併の場合は包括承継により自動的に移転する。M&Aスキームの選択が従業員の雇用関係に直接影響する重要論点。",
    url: "https://laws.e-gov.go.jp/law/419AC0000000128",
    tags: ["事業承継", "労働契約", "個別同意", "包括承継", "雇用維持"],
    relatedIndustries: ["全業種"],
  },
  {
    id: "labor-dismissal",
    name: "整理解雇の四要件（労働契約法第16条）",
    category: "労働法",
    description:
      "M&A後のリストラクチャリングにおける整理解雇の有効性判断基準。人員削減の必要性、解雇回避努力、被解雇者選定の合理性、手続の妥当性の4要件を満たす必要がある。PMIにおける重要な法的制約。",
    url: "https://laws.e-gov.go.jp/law/419AC0000000128",
    tags: ["整理解雇", "四要件", "リストラ", "解雇権濫用", "PMI"],
    relatedIndustries: ["全業種"],
  },
  {
    id: "labor-disadvantageous-change",
    name: "労働条件の不利益変更（労働契約法第8条～第10条）",
    category: "労働法",
    description:
      "M&A後の労働条件統一に際して、従業員にとって不利益な変更を行う場合の法的要件。就業規則の変更による場合は合理性と周知が必要。個別合意がない限り一方的な不利益変更は原則無効。",
    url: "https://laws.e-gov.go.jp/law/419AC0000000128",
    tags: ["不利益変更", "労働条件", "就業規則", "合理性", "PMI"],
    relatedIndustries: ["全業種"],
  },
  {
    id: "labor-transfer-secondment",
    name: "転籍・出向（労働契約法・民法）",
    category: "労働法",
    description:
      "M&Aに伴うグループ内での人事異動の形態。出向は元の雇用関係を維持しつつ他社で勤務する形態、転籍は元の会社を退職して新会社と雇用契約を締結する形態。転籍には労働者の個別同意が必要。",
    url: "https://laws.e-gov.go.jp/law/419AC0000000128",
    tags: ["転籍", "出向", "人事異動", "個別同意", "グループ再編"],
    relatedIndustries: ["全業種"],
  },

  // ============================================================
  // 外為法・国際 (5 entries)
  // ============================================================
  {
    id: "fefta-prior-notification",
    name: "外為法の事前届出制度（外国為替及び外国貿易法第27条）",
    category: "外為法",
    description:
      "外国投資家が安全保障上重要な業種の日本企業に一定以上の投資を行う場合に事前届出を義務付ける制度。2020年改正により届出基準が10%から1%に引き下げられ、規制が大幅に強化された。",
    url: "https://laws.e-gov.go.jp/law/324AC0000000228",
    tags: ["外為法", "事前届出", "1%ルール", "対内直接投資", "安全保障"],
    relatedIndustries: [
      "防衛",
      "電力",
      "通信",
      "半導体",
      "サイバーセキュリティ",
    ],
  },
  {
    id: "fefta-security-review",
    name: "安全保障関連の投資審査（外為法・コア業種規制）",
    category: "外為法",
    description:
      "武器製造、原子力、電力、通信、半導体等のコア業種への外国投資について特に厳格な審査を行う制度。事前届出に対する審査期間は最大5ヶ月で、投資の変更・中止命令が出される場合がある。",
    url: "https://laws.e-gov.go.jp/law/324AC0000000228",
    tags: ["コア業種", "安全保障審査", "投資審査", "変更命令", "中止命令"],
    relatedIndustries: ["防衛", "原子力", "電力", "通信", "半導体"],
  },
  {
    id: "cross-border-ma",
    name: "クロスボーダーM&A規制（外為法・各国競争法）",
    category: "外為法",
    description:
      "国際的なM&Aにおいて各国の投資規制・競争法規制への対応が必要。日本の外為法に加え、関係各国の企業結合届出・外資規制への対応が求められ、マルチジュリスディクションの規制対応が複雑化している。",
    url: "https://laws.e-gov.go.jp/law/324AC0000000228",
    tags: [
      "クロスボーダーM&A",
      "マルチジュリスディクション",
      "外資規制",
      "国際M&A",
    ],
    relatedIndustries: ["全業種"],
  },
  {
    id: "cfius-reference",
    name: "CFIUS（対米外国投資委員会）（参考：米国制度）",
    category: "外為法",
    description:
      "米国の外国投資審査制度。日本企業が米国企業を買収する際に安全保障審査の対象となる可能性がある。FIRRMA（2018年）により審査範囲が拡大され、不動産取引や非支配的投資も対象に含まれるようになった。",
    url: "https://home.treasury.gov/policy-issues/international/the-committee-on-foreign-investment-in-the-united-states-cfius",
    tags: ["CFIUS", "FIRRMA", "米国", "安全保障審査", "対外投資"],
    relatedIndustries: ["防衛", "テクノロジー", "通信", "エネルギー"],
  },
  {
    id: "foreign-entry-regulation",
    name: "外国企業の日本市場参入規制（外為法・各業法）",
    category: "外為法",
    description:
      "外国企業が日本市場に参入する際に適用される各種規制。外為法の対内直接投資届出に加え、業種ごとの個別規制（銀行法、放送法、航空法等の外資規制）への対応が必要。営業所・子会社設立の手続も含む。",
    url: "https://laws.e-gov.go.jp/law/324AC0000000228",
    tags: ["外国企業参入", "対内投資", "外資規制", "日本市場", "拠点設立"],
    relatedIndustries: ["全業種"],
  },

  // ============================================================
  // 業界規制 (8 entries)
  // ============================================================
  {
    id: "banking-act",
    name: "銀行法（議決権保有制限）",
    category: "業法",
    description:
      "銀行の他業禁止と議決権保有制限（5%ルール・銀行持株会社は15%ルール）を規定。銀行業の認可制度や合併・事業譲渡の認可手続も定める。金融機関のM&Aでは金融庁の事前認可が必要。",
    url: "https://laws.e-gov.go.jp/law/356AC0000000059",
    tags: ["銀行法", "5%ルール", "議決権保有制限", "金融庁認可", "他業禁止"],
    relatedIndustries: ["金融", "銀行"],
  },
  {
    id: "insurance-business-act",
    name: "保険業法",
    category: "業法",
    description:
      "保険会社の設立・監督に関する法律。保険会社間の合併・事業譲渡には金融庁長官の認可が必要。保険契約の移転手続、保険会社の株式取得に関する規制（主要株主規制）も定める。",
    url: "https://laws.e-gov.go.jp/law/407AC0000000105",
    tags: ["保険業法", "合併認可", "主要株主規制", "保険契約移転", "金融庁"],
    relatedIndustries: ["保険", "金融"],
  },
  {
    id: "broadcast-act",
    name: "放送法（外国人株式保有制限）",
    category: "業法",
    description:
      "地上波放送局の外国人直接保有を20%未満に制限し、間接保有を含む規制も設けている。放送事業者のM&Aにおいては外資規制への適合性確認が必要で、違反した場合は認定取消しの対象となる。",
    url: "https://laws.e-gov.go.jp/law/325AC0000000132",
    tags: ["放送法", "外資規制", "20%制限", "放送免許", "メディア"],
    relatedIndustries: ["放送", "メディア", "通信"],
  },
  {
    id: "pharmaceutical-act",
    name: "医薬品医療機器等法（薬機法）",
    category: "業法",
    description:
      "医薬品・医療機器の製造販売に係る許認可制度を規定。製薬企業のM&Aでは製造販売承認・製造業許可の承継手続が重要論点。許認可の承継には地方自治体・厚生労働省への届出・変更手続が必要。",
    url: "https://laws.e-gov.go.jp/law/335AC0000000145",
    tags: ["薬機法", "製造販売承認", "製造業許可", "許認可承継", "厚生労働省"],
    relatedIndustries: ["製薬", "医療機器", "ヘルスケア"],
  },
  {
    id: "premiums-act",
    name: "景品表示法（不当景品類及び不当表示防止法）",
    category: "業法",
    description:
      "商品・サービスの不当な表示や過大な景品類を規制する法律。M&Aにおけるデューデリジェンスで対象会社の広告・表示の適法性を確認する必要がある。違反には課徴金制度が適用される。",
    url: "https://laws.e-gov.go.jp/law/337AC0000000134",
    tags: ["景表法", "不当表示", "課徴金", "広告規制", "DD"],
    relatedIndustries: ["消費財", "小売", "食品", "化粧品"],
  },
  {
    id: "personal-information-act",
    name: "個人情報保護法",
    category: "業法",
    description:
      "個人データの取扱いに関する法律。M&Aにおけるデューデリジェンスでの個人情報の提供・取扱い、統合後のデータ管理体制構築が重要論点。事業承継に伴う個人データの第三者提供には例外規定がある。",
    url: "https://laws.e-gov.go.jp/law/415AC0000000057",
    tags: ["個人情報", "データ保護", "DD", "第三者提供", "プライバシー"],
    relatedIndustries: ["全業種", "IT", "ヘルスケア"],
  },
  {
    id: "construction-business-act",
    name: "建設業法",
    category: "業法",
    description:
      "建設業の許可制度を規定。建設会社のM&Aでは、合併の場合は事前認可申請により許可を承継できるが、事業譲渡の場合は新たに許可を取得する必要がある。経営事項審査の継続性も重要な論点。",
    url: "https://laws.e-gov.go.jp/law/324AC0000000100",
    tags: ["建設業許可", "経審", "許可承継", "事前認可", "経営事項審査"],
    relatedIndustries: ["建設", "不動産"],
  },
  {
    id: "telecommunications-act",
    name: "電気通信事業法",
    category: "業法",
    description:
      "電気通信事業者の登録・届出制度を規定。基幹通信事業者のM&Aには総務大臣の認可が必要な場合がある。外資規制（NTT法等）や電波法上の制約も考慮する必要があり、通信業界のM&Aは規制対応が複雑。",
    url: "https://laws.e-gov.go.jp/law/359AC0000000086",
    tags: ["電気通信", "総務省認可", "基幹通信", "外資規制", "電波法"],
    relatedIndustries: ["通信", "IT"],
  },

  // ============================================================
  // その他（倒産法・産業政策・事業承継等） (8 entries)
  // ============================================================
  {
    id: "civil-rehabilitation-act",
    name: "民事再生法",
    category: "倒産法",
    description:
      "経営困難に陥った企業の再建を図る法律。スポンサー型の民事再生手続では、スポンサー企業が事業譲受けや新株引受けにより事業を取得する。プレパッケージ型M&Aとして迅速な事業再生を実現できる。",
    url: "https://laws.e-gov.go.jp/law/411AC0000000225",
    tags: ["民事再生", "事業再生", "スポンサー", "プレパッケージ", "再建型"],
    relatedIndustries: ["全業種"],
  },
  {
    id: "corporate-reorganization-act",
    name: "会社更生法",
    category: "倒産法",
    description:
      "株式会社の再建を目的とする倒産処理法。裁判所の監督下で更生計画を策定し、スポンサーを選定して事業再生を図る。大規模企業の再建に利用され、担保権の行使も制限される強力な手続。",
    url: "https://laws.e-gov.go.jp/law/414AC0000000154",
    tags: [
      "会社更生",
      "更生計画",
      "スポンサー選定",
      "担保権制限",
      "大規模再建",
    ],
    relatedIndustries: ["全業種"],
  },
  {
    id: "industrial-competitiveness-act",
    name: "産業競争力強化法",
    category: "産業政策",
    description:
      "事業再編や新事業創出を促進する法律。特別事業再編計画の認定により税制優遇（登録免許税・不動産取得税の軽減等）や金融支援、許認可の特例措置を受けられる。大規模な事業ポートフォリオ再編を支援する。",
    url: "https://laws.e-gov.go.jp/law/425AC0000000098",
    tags: [
      "産業競争力",
      "事業再編",
      "税制優遇",
      "特別事業再編計画",
      "許認可特例",
    ],
    relatedIndustries: ["全業種"],
  },
  {
    id: "sme-strengthening-act",
    name: "中小企業等経営強化法",
    category: "産業政策",
    description:
      "中小企業の経営力向上を支援する法律。経営力向上計画の認定を受けることで、M&Aに伴う不動産取得税・登録免許税の軽減、金融支援等の措置を受けられる。中小企業M&Aの税負担軽減に有効。",
    url: "https://laws.e-gov.go.jp/law/411AC0000000018",
    tags: ["経営力向上計画", "中小企業", "税制支援", "金融支援", "経営強化"],
    relatedIndustries: ["中小企業", "全業種"],
  },
  {
    id: "sme-succession-act",
    name: "経営承継円滑化法（中小企業における経営の承継の円滑化に関する法律）",
    category: "事業承継",
    description:
      "中小企業の事業承継を支援する法律。非上場株式等の贈与税・相続税の納税猶予制度（事業承継税制）を規定。M&Aによる第三者承継の場合にも所在不明株主の株式買取手続の特例等が利用可能。",
    url: "https://laws.e-gov.go.jp/law/420AC0000000033",
    tags: ["経営承継", "事業承継税制", "納税猶予", "相続税", "贈与税"],
    relatedIndustries: ["中小企業", "全業種"],
  },
  {
    id: "civil-code-contracts",
    name: "民法（契約法）",
    category: "民法",
    description:
      "契約法の一般原則を規定する基本法。M&A契約（SPA、SHA等）の法的基盤を提供し、表明保証違反、損害賠償、契約解除、時効等の規律が適用される。2020年改正により債権法が大幅に改正された。",
    url: "https://laws.e-gov.go.jp/law/129AC0000000089",
    tags: ["民法", "契約法", "表明保証", "損害賠償", "SPA", "SHA"],
    relatedIndustries: ["全業種"],
  },
  {
    id: "general-incorporated-act",
    name: "一般社団法人及び一般財団法人に関する法律",
    category: "その他",
    description:
      "一般社団法人・財団法人の設立・運営に関する法律。M&A仲介やアドバイザリーの業界団体、SPC（特別目的会社）の代替としての一般社団法人の活用、信託スキームでの利用等に関連する。",
    url: "https://laws.e-gov.go.jp/law/418AC0000000048",
    tags: ["一般社団法人", "一般財団法人", "SPC", "信託スキーム"],
    relatedIndustries: ["全業種"],
  },
  {
    id: "act-on-strengthening-ma-tax",
    name: "中小企業のM&A税制（経営資源集約化税制）",
    category: "事業承継",
    description:
      "中小企業がM&Aを実施する際の税制優遇措置。経営力向上計画に基づくM&Aで、設備投資減税（即時償却等）や準備金の積立（取得価額の70%）による税負担軽減が可能。中小企業の成長型M&Aを後押しする。",
    url: "https://laws.e-gov.go.jp/law/411AC0000000018",
    tags: [
      "経営資源集約化",
      "中小企業M&A",
      "準備金",
      "設備投資減税",
      "即時償却",
    ],
    relatedIndustries: ["中小企業", "全業種"],
  },
];

// ---- Search ----

export function searchLaws(query?: string, category?: string): LawEntry[] {
  let results = MA_LAWS;
  if (category) {
    results = results.filter((law) => law.category === category);
  }
  if (query) {
    const q = query.toLowerCase();
    results = results.filter(
      (law) =>
        law.name.toLowerCase().includes(q) ||
        law.description.toLowerCase().includes(q) ||
        law.category.toLowerCase().includes(q) ||
        law.tags.some((t) => t.toLowerCase().includes(q)) ||
        law.relatedIndustries.some((i) => i.toLowerCase().includes(q)),
    );
  }
  return results;
}

// ---- Helpers ----

export function getLawsByCategory(category: string): LawEntry[] {
  return MA_LAWS.filter((law) => law.category === category);
}

export function getAllCategories(): string[] {
  return [...new Set(MA_LAWS.map((law) => law.category))];
}
