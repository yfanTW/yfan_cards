# 資料格式規格（Step 1）

所有資料都在 `data/`，網站只讀不寫。只有管理者用管理工具（另一個 repo `card-checklist-admin`）修改。

## 1. 產品索引 `data/products.json`

```json
{
  "products": [
    {
      "slug": "2026-bowman-baseball",
      "name": "2026 Bowman Baseball",
      "year": 2026,
      "brand": "Topps",
      "sport": "Baseball",
      "release_date": "2026-05-06",
      "updated": "2026-11-26"
    }
  ]
}
```

- `slug`：產品唯一代號，只能用小寫英數字和 `-`，也是檔名 `data/products/<slug>.json`。**建立後不可更改**（使用者的最愛會用到它）。
- `card_count` 不存，網站自己算。
- **順序**：`products` 陣列的順序就是首頁同一年內的顯示順序（年份之間依年份新到舊）。
- `image`（選用）：首頁卡片圖片，路徑相對於 `data/`，例如 `"images/2026-bowman-baseball.webp"`；`image_v` 是上傳時間，用來讓瀏覽器重新抓新圖。

## 2. 產品 checklist `data/products/<slug>.json`

```json
{
  "slug": "2026-bowman-baseball",
  "name": "2026 Bowman Baseball",
  "use_first": true,
  "groups": ["Base", "Insert", "Autograph", "Parallel"],
  "cards": [
    {
      "id": "chrome-prospects/bcp-1",
      "no": "BCP-1",
      "player": "Chase Burns",
      "team": "Cincinnati Reds",
      "group": "Insert",
      "set": "Chrome Prospects",
      "rc": true,
      "first": true,
      "tags": [],
      "note": ""
    }
  ]
}
```

| 欄位 | 必填 | 說明 |
|---|---|---|
| `id` | ✔ | 產品內唯一。預設由 `slugify(set) + "/" + slugify(no)` 產生。**產生後永不更改**，即使之後修改卡號或球員也一樣。 |
| `no` | ✔ | 卡號，原樣保留（`1`、`BCP-1`、`CPA-JW`）。 |
| `player` | ✔ | 球員名稱。多人卡用 ` / ` 分隔，例如 `"Shohei Ohtani / Mike Trout"`。 |
| `team` | ✔ | 球隊全名，要對應 `data/teams.json`；查不到時網站會用預設顏色。多人卡同樣用 ` / ` 分隔。 |
| `group` | ✔ | 大分類，必須在 `groups` 清單內。 |
| `set` | ✔ | 子系列，例如 `Base`、`Chrome Prospects`、`Anime`。 |
| `rc` | ✔ | `true` / `false`，Rookie Card 標記。 |
| `first` | 產品開啟 1st 時必填 | `true` / `false`，1st 標記（例如 1st Bowman）。產品沒開啟時不能有這個欄位。 |
| `tags` | | 其他標記，例如 `["SP", "SSP"]`。`1st` 不放這裡，會自動轉成 `first` 欄位。 |
| `note` | | 備註，例如 `"Image Variation"`。 |

**產品層級設定 `use_first`**：這個產品是否使用 1st 特殊欄位（預設 false）。開啟後網站會顯示 1st 標籤和「全部 / 1st / 非1st」篩選；關閉時所有卡的 1st 標記會被清除。

**產品層級設定 `pulled_sets`**（選用）：要追蹤「已抽出」的子系列名稱清單，例如 `["MLB Debut Patch Autographs"]`。這些子系列裡已經有人抽到的卡會標 `"pulled": true`（沒抽出就不寫這個欄位）；其他子系列的卡不能有 `pulled`。網站會顯示「已抽出」標籤，並提供「全部 / 隱藏已抽出 / 只看已抽出」篩選（清單、統計、球隊頁都適用）。

卡片的顯示順序 = 陣列順序（匯入時的順序）。網站另外提供依卡號、球員、球隊排序。

## 3. 球隊資料 `data/teams.json`

```json
{
  "teams":   { "New York Yankees": { "abbr": "NYY", "color": "#003087" } },
  "legacy":  { "Brooklyn Dodgers": "Los Angeles Dodgers" }
}
```

`legacy` 把舊隊名對應到現在的隊伍，篩選球隊時會合併在一起。

## 4. 最愛功能用到的 key（Step 2 會實作）

| 類型 | key | 範例 |
|---|---|---|
| 最愛卡片 | `<slug>/<id>` | `2026-bowman-baseball/chrome-prospects/bcp-1` |
| 最愛球員 | 正規化的球員名稱（小寫、去掉重音、合併多餘空白） | `julio rodriguez` |

所以 `slug` 和 `id` 都必須穩定，管理工具的 `validate.py` 會檢查格式和是否重複。
