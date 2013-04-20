ニコ生アリーナ
--------------

本ソースコードは、[Google Chromeの拡張](http://code.google.com/chrome/extensions/index.html) ニコ生アリーナのソースコードです。


## 機能

ニコ生アリーナは、[ニコニコ生放送](http://live.nicovideo.jp/)を便利に使うための拡張です。

ただし、この拡張は原宿バージョンには対応していません。

主な機能は以下の通りです。

- ニコ生自動入場
- ニコ生自動枠移動
- 参加中のコミュニティ/チャンネルの放送番組の一覧表示
- タイムシフト予約中の番組一覧表示
- 公式放送番組の一覧表示
- 一覧表示上に番組の状態(開場前/開場中/放送中)を表示
- 番組の状態に応じた番組数をバッジ表示
- デスクトップ通知
- 自動タブオープン
- ニコ生閲覧履歴


## 対応予定

- 通知/自動タブオープンを時間に厳密にする
- アニメ一挙の表示
- 自動オープンの例外設定 (UI改善 + 公式やTSは画面からON/OFF可能にする)
- 設定を規定値に戻す
- Gateページが存在しない場合の対応
- Locale (en/ja)
- jQuery1.9
- テーマ (黒)
- 共通処理の抜き出し(名前空間/common.js)
- 一部、開場/開演日時の取得が年をまたぐ場合に対応していない
- 履歴保存時に毎回localStorageから呼び出さずキャッシュを持つ
- 登録チャネルの放送予定

その他、バグ報告や要望、ご指摘やアドバイスなどありましたら、遠慮なくお願いします。


## スクリーンショット

![favorite](https://raw.github.com/yonchu/niconama-arena/master/img/screenshot_favorite.png)

![ts](https://raw.github.com/yonchu/niconama-arena/master/img/screenshot_ts.png)

![official](https://raw.github.com/yonchu/niconama-arena/master/img/screenshot_official.png)

![history](https://raw.github.com/yonchu/niconama-arena/master/img/screenshot_history.png)

![settings](https://raw.github.com/yonchu/niconama-arena/master/img/screenshot_settings.png)

![autoenter](https://raw.github.com/yonchu/niconama-arena/master/img/screenshot_auto_enter.png)


## その他

アイコンはニコニココモンズよりお借りしました。ありがとうございます。

- [niconicoアイコン黒 - ニコニ･コモンズ](http://commons.nicovideo.jp/material/nc58317)


## See also

- [yonchu/niconama-arena](https://github.com/yonchu/niconama-arena)
