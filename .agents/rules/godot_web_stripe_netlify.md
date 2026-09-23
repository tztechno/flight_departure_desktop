# Godot Web × Netlify Functions × Stripe / Netlify Blobs 連携開発ルール・知見集

Godot Engine製のWebブラウザゲーム（HTML5/Wasm）において、**Netlify Functions**（バックエンド）、**Netlify Blobs**（永続ストレージ/回数制限）、**Stripe Checkout**（課金決済）を連携させる際の必須設計ルールとトラブルシューティング集。

---

## 📌 1. Netlify Functions のビルド・依存関係設定（最重要）

### 【発生しやすいトラブル】
Netlify Functions をデプロイした際、`Cannot find package '@netlify/blobs'` や `Cannot find package 'stripe'` などの **502 ERR_MODULE_NOT_FOUND** が発生して関数がクラッシュする。

### 【原因】
- リポジトリのルートに `package.json` が無く、`netlify/functions/package.json` などサブディレクトリにのみ配置されている場合、Netlifyのデフォルトビルドでは `npm install` やパッケージのバンドルが実行されない。
- `netlify.toml` にバンドラー指定がない場合、依存モジュールがデプロイ成果物に含まれない。

### 【必須設定】
1. **リポジトリルートに `package.json` を配置**:
   ```json
   {
     "name": "project-name",
     "version": "1.0.0",
     "private": true,
     "type": "module",
     "dependencies": {
       "@netlify/blobs": "^11.0.1",
       "stripe": "^16.9.0"
     }
   }
   ```
2. **`netlify.toml` にビルドコマンドと `esbuild` バンドラーを明記**:
   ```toml
   [build]
     publish = "build/web"
     command = "npm install"

   [functions]
     directory = "netlify/functions"
     node_bundler = "esbuild"
   ```
3. **`.gitignore` に `node_modules/` を追加**。

---

## 📌 2. Godot Web (Wasm) における Client ID 永続化ルール

### 【発生しやすいトラブル】
Stripe決済ページへ遷移（`window.location.href = url`）し、決済完了後にゲームへ戻ってきた際、アンロック処理に失敗する、あるいは無料プレイ回数がリセット・再生成されてしまう。

### 【原因】
- Godotの `user://` はブラウザの IndexedDB (Emscripten IDBFS) に保存されるが、ページ離脱時やリロード時にブラウザへ即時同期されない場合がある。
- その結果、リロード時に新しいランダムな Client ID が生成され、Stripeセッションの `metadata.client_id` と突合できなくなる。

### 【必須実装】
1. **Web環境では `localStorage` を使用して Client ID を永続化**:
   - `OS.has_feature("web")` の場合、`JavaScriptBridge.eval("localStorage.getItem('...')")` を使用する。
2. **リダイレクト時の URL クエリから Client ID を優先復元**:
   - Stripeの `success_url` に `?session_id={CHECKOUT_SESSION_ID}&client_id=${clientId}` を含める。
   - ゲーム初期化時に URL パラメータに `client_id` があればそれを最優先で採用し、`localStorage` と同期する。

```gdscript
# backend_client.gd 実装例
func _get_or_create_client_id() -> String:
	if OS.has_feature("web"):
		# 1. リダイレクトURLのクエリパラメータを確認
		var query: Variant = JavaScriptBridge.eval("window.location.search", true)
		if typeof(query) == TYPE_STRING and query != "" and query != "?":
			var trimmed := (query as String).trim_prefix("?")
			for pair in trimmed.split("&"):
				var parts := pair.split("=", true, 1)
				if parts.size() > 0 and parts[0].uri_decode() == "client_id" and parts.size() > 1:
					var cid := parts[1].uri_decode().strip_edges()
					if cid != "":
						JavaScriptBridge.eval("localStorage.setItem('game_client_id', %s);" % JSON.stringify(cid))
						return cid

		# 2. localStorage を確認
		var stored: Variant = JavaScriptBridge.eval("localStorage.getItem('game_client_id')", true)
		if typeof(stored) == TYPE_STRING and stored != "" and stored != "null":
			return stored

		# 3. 新規生成して localStorage に保存
		var new_web_id := Crypto.new().generate_random_bytes(16).hex_encode()
		JavaScriptBridge.eval("localStorage.setItem('game_client_id', %s);" % JSON.stringify(new_web_id))
		return new_web_id

	# 非Web環境（エディタ/デスクトップ）用フォールバック
	var path := "user://client_id.txt"
	if FileAccess.file_exists(path):
		var existing := FileAccess.open(path, FileAccess.READ).get_as_text().strip_edges()
		if existing != "":
			return existing

	var new_id := Crypto.new().generate_random_bytes(16).hex_encode()
	var file := FileAccess.open(path, FileAccess.WRITE)
	file.store_string(new_id)
	return new_id
```

---

## 📌 3. Godot エクスポート設定（`export_presets.cfg`）の除外ルール

### 【発生しやすいトラブル】
プロジェクトルートに `node_modules` や `package.json` を配置した結果、Godotの Web エクスポート（`.pck` ファイル）に数十MBの Node.js 依存ファイルが紛れ込み、ロード時間が極端に長くなる。

### 【必須設定】
`godot_bear/export_presets.cfg` の `exclude_filter` に以下を含めること：
```ini
exclude_filter="backend/*,build/*,netlify/*,node_modules/*,package.json,package-lock.json,*.md"
```

---

## 📌 4. Netlify Blobs / Stripe の安全なバックエンド設計

1. **Netlify Blobs の初期化**:
   - Netlify Functions ランタイム環境（`process.env.AWS_LAMBDA_FUNCTION_NAME` 等）を考慮し、ローカル開発時用モックと Netlify Blobs 本番ストレージがシームレスに切り替わるように try-catch 構造にする。
2. **Stripe 本番キーの管理**:
   - Netlify ダッシュボードの `Site configuration` > `Environment variables` に `STRIPE_SECRET_KEY` を登録する。
3. **決済確認（Confirm API）のログ出力**:
   - 決済確認時に `payment_status` と `client_id` の突合ログをコンソール出力（Netlify Functionログ）に残し、万が一の不一致時に原因が即座に特定できるようにする。
