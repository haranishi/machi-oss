-- ============================================================================
-- 街の通信簿 — 初期スキーマ (0001_init)
-- 国の公開API（国交省 不動産情報ライブラリ / 総務省 e-Stat / 気象庁）から取得した
-- 客観データを正規化して保存し、市区町村ページ・比較ページ・送客クリック計測を支える。
--
-- 方針:
--   * バッチ（夜間 cron）で各APIを取得 → このDBへ upsert。表示は自前DB参照で高速＆レート制限回避。
--   * SEOページ（市区町村・比較）は未ログインで閲覧可 → 公開テーブルは RLS で read-only 公開。
--   * 北極星指標 = 街ページ → 不動産/引越サービスへの送客クリック（click_events）。
--   * 全国 約1,741 市区町村 × 指標 の programmatic SEO を想定。
-- 命名: lowercase / snake_case、時刻は timestamptz、団体コードは5桁 char(5)。
-- ============================================================================

create extension if not exists pgcrypto; -- gen_random_uuid() 用（Supabaseは既定で利用可）

-- ---------------------------------------------------------------------------
-- 共通: updated_at 自動更新トリガ関数
-- ---------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ===========================================================================
-- municipalities: 市区町村マスタ（全国地方公共団体コードを主キー）
-- ===========================================================================
create table municipalities (
  code        char(5) primary key,                         -- 全国地方公共団体コード（例: 13112 = 東京都世田谷区）
  name        text        not null,                         -- 市区町村名（例: 世田谷区）
  pref        text        not null,                         -- 都道府県名（例: 東京都）
  region      text,                                         -- 地方区分（例: 関東・近畿）
  lat         double precision,                             -- 代表点 緯度
  lng         double precision,                             -- 代表点 経度
  population  integer,                                      -- 人口（最新の代表値・詳細な時系列は metrics）
  households  integer,                                      -- 世帯数（同上）
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
comment on table  municipalities is '市区町村マスタ。全国地方公共団体コードを主キーに、表示用の代表値を保持する。';
comment on column municipalities.code is '全国地方公共団体コード（5桁。先頭2桁=都道府県コード）。';

create index municipalities_pref_idx   on municipalities (pref);
create index municipalities_region_idx on municipalities (region);

create trigger municipalities_set_updated_at
  before update on municipalities
  for each row execute function set_updated_at();

-- ===========================================================================
-- metrics: 時系列の数値指標（人口・地価・取引価格統計・気候 など）
--   1行 = ある市区町村の、ある指標種別の、ある年（or 年月）の値。出典を必ず保持。
-- ===========================================================================
create table metrics (
  id                 bigint generated always as identity primary key,
  municipality_code  char(5)     not null references municipalities (code) on delete cascade,
  metric_type        text        not null,                 -- 指標種別: population / households / pop_trend / aging_rate /
                                                            --           land_price / land_price_trend / tx_price_avg /
                                                            --           rent_avg / avg_temp / sunny_days ...
  value              numeric      not null,                 -- 値（円/m²・万円・%・件・℃ 等。単位は unit を参照）
  unit               text,                                  -- 単位（例: 円/m², 万円, %, ℃, 人）
  year               smallint,                              -- 対象年（時系列の主キー軸。年月が要る場合は period を併用）
  period             text,                                  -- 対象期間の補助（例: 2024Q1, 2024-06。年だけなら null）
  source             text         not null,                 -- 出典（例: 国交省 不動産情報ライブラリ / 総務省 e-Stat / 気象庁）
  created_at         timestamptz  not null default now(),
  unique (municipality_code, metric_type, year, period)
);
comment on table  metrics is '市区町村×指標種別×年 の時系列数値。人口/地価/取引価格統計/気候などを横断的に格納する。';
comment on column metrics.metric_type is '指標種別の識別子（snake_case）。表示側のラベルとマッピングする。';

create index metrics_code_type_idx on metrics (municipality_code, metric_type);
create index metrics_type_year_idx on metrics (metric_type, year);

-- ===========================================================================
-- hazards: ハザード判定（洪水・土砂・地震・津波・液状化・高潮・延焼 など）
--   level は 0=低 〜 3=高 を基本（種別により最大値が異なるため上限は緩めに許容）。
-- ===========================================================================
create table hazards (
  id                 bigint generated always as identity primary key,
  municipality_code  char(5)     not null references municipalities (code) on delete cascade,
  hazard_type        text        not null,                 -- flood(洪水) / landslide(土砂) / quake(地震) /
                                                            -- tsunami(津波) / liquefaction(液状化) / storm_surge(高潮) / fire(延焼)
  level              smallint    not null check (level between 0 and 5), -- 0=低 … 高（種別ごとの目安）
  note               text,                                  -- 補足（対象区域・想定規模など）
  source             text        not null,                 -- 出典（国交省 不動産情報ライブラリ）
  created_at         timestamptz not null default now(),
  unique (municipality_code, hazard_type)
);
comment on table  hazards is '市区町村ごとのハザード種別と相対レベル。実際の自宅位置は各自治体ハザードマップで要確認の前提。';

create index hazards_code_idx on hazards (municipality_code);

-- ===========================================================================
-- facilities: 周辺施設の件数（学校・保育・病院・図書館・公園・スーパー など）
-- ===========================================================================
create table facilities (
  id                 bigint generated always as identity primary key,
  municipality_code  char(5)     not null references municipalities (code) on delete cascade,
  facility_type      text        not null,                 -- school / daycare / hospital / library / park / supermarket ...
  count              integer     not null check (count >= 0), -- 件数
  source             text        not null,                 -- 出典（国交省 不動産情報ライブラリ 等）
  created_at         timestamptz not null default now(),
  unique (municipality_code, facility_type)
);
comment on table facilities is '市区町村ごとの施設種別と件数。利便・子育てスコアの算出材料。';

create index facilities_code_idx on facilities (municipality_code);

-- ===========================================================================
-- api_cache: 外部APIレスポンスの一次キャッシュ（レート制限・多重リクエスト対策）
--   endpoint + params のハッシュで一意化。expires_at を過ぎたら再取得する運用。
-- ===========================================================================
create table api_cache (
  id           bigint generated always as identity primary key,
  endpoint     text        not null,                        -- 呼び出したAPIのパス（例: reinfolib /ex-api/external/XIT001）
  params_hash  text        not null,                        -- クエリパラメータの正規化ハッシュ（sha256 等）
  params       jsonb,                                       -- 参照用に元パラメータも保持（デバッグ・再取得用）
  response     jsonb       not null,                        -- 取得した生レスポンス（JSON）
  fetched_at   timestamptz not null default now(),          -- 取得日時
  expires_at   timestamptz,                                 -- 失効日時（null=無期限。バッチで判定）
  unique (endpoint, params_hash)
);
comment on table api_cache is '外部API（reinfolib/e-Stat/気象庁）の生レスポンス一次キャッシュ。レート制限回避と再現性のため。再配布可否は各APIの規約に従う。';

create index api_cache_expires_idx on api_cache (expires_at);

-- ===========================================================================
-- compare_lists: ログインユーザーの比較リスト（保存・共有用。任意機能）
--   codes に市区町村コードの配列を保持（順序維持）。
-- ===========================================================================
create table compare_lists (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users (id) on delete cascade, -- Supabase Auth ユーザー
  name        text,                                          -- リスト名（例: 「子育て候補」）
  codes       char(5)[]   not null default '{}',             -- 比較対象の市区町村コード配列（2〜3件想定）
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
comment on table compare_lists is 'ユーザーが保存する比較リスト。未ログインでも比較自体はURLクエリ(?m=)で可能で、本テーブルは保存したい人だけが使う。';

create index compare_lists_user_idx on compare_lists (user_id);

create trigger compare_lists_set_updated_at
  before update on compare_lists
  for each row execute function set_updated_at();

-- ===========================================================================
-- click_events: 北極星指標。街ページ → 外部（不動産/引越アフィリ）への送客クリック
-- ===========================================================================
create table click_events (
  id                 bigint generated always as identity primary key,
  municipality_code  char(5)     references municipalities (code) on delete set null, -- どの街ページからか（null可）
  event_type         text        not null default 'outbound_click', -- outbound_click / compare_open / search ...
  target             text,                                  -- 送客先（例: suumo / homes / hikkoshi）
  target_url         text,                                  -- 実際の遷移先URL
  page_path          text,                                  -- 発生ページ（例: /m/13112）
  referrer           text,                                  -- リファラ
  session_id         text,                                  -- 匿名セッションID（GA4等と突合）
  user_id            uuid        references auth.users (id) on delete set null, -- ログイン時のみ
  created_at         timestamptz not null default now()
);
comment on table  click_events is '北極星指標。市区町村ページから不動産/引越サービスへの送客クリックを記録する。';
comment on column click_events.target is '送客先サービスの識別子。collectでアフィリ成果と突合する。';

create index click_events_created_idx on click_events (created_at);
create index click_events_code_idx    on click_events (municipality_code);

-- ===========================================================================
-- Row Level Security (RLS)
--   公開テーブル: 誰でも select 可（SEOページ用）。書き込みは service_role（バッチ）のみ。
--   ユーザーテーブル(compare_lists): 本人のみ CRUD。
--   サーバ専用(api_cache / click_events): 既定で全拒否（service_role は RLS を迂回）。
--     ※ click_events への匿名INSERTは サーバ側API経由（service_role）で受ける想定。
-- ===========================================================================
alter table municipalities enable row level security;
alter table metrics        enable row level security;
alter table hazards        enable row level security;
alter table facilities     enable row level security;
alter table api_cache      enable row level security;
alter table compare_lists  enable row level security;
alter table click_events   enable row level security;

-- 公開（read-only）ポリシー
create policy "public read municipalities" on municipalities for select using (true);
create policy "public read metrics"        on metrics        for select using (true);
create policy "public read hazards"        on hazards        for select using (true);
create policy "public read facilities"     on facilities     for select using (true);

-- 比較リストは本人のみ
create policy "own compare_lists select" on compare_lists for select using (auth.uid() = user_id);
create policy "own compare_lists insert" on compare_lists for insert with check (auth.uid() = user_id);
create policy "own compare_lists update" on compare_lists for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own compare_lists delete" on compare_lists for delete using (auth.uid() = user_id);

-- api_cache / click_events は公開ポリシーを作らない（= 匿名・authロールからは全拒否）。
-- 書き込み/読み出しはサーバの service_role キー経由でのみ行う。
