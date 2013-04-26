ニコ生アリーナ
--------------------

This source code is for [Google Chrome Extension](http://code.google.com/chrome/extensions/index.html) "niconama-arena".

- [Chrome ウェブストア - ニコ生アリーナ](https://chrome.google.com/webstore/detail/%E3%83%8B%E3%82%B3%E7%94%9F%E3%82%A2%E3%83%AA%E3%83%BC%E3%83%8A/lkkpfmnibpgpmhbkjgldlmonaphmoobl)

## Usage

Installation.

```console
$ make install
```

Development build.

```console
$ make [build]
```

## Release procedure

Bump up to version number.

```console
$ $EDITOR contents/manifest.json
"version": "x.x.x" => "version": "y.y.y"
```

Write change log to README.

```console
$ $EDITOR README.md
```

Release build.

```console
$ make release
```

Release commit.

```
$ git ca -m 'Release ver.x.x.x'
$ git tag -a x.x.x -m "Release ver.x.x.x"
$ git push && git push --tags
```

Upload niconama-arena.zip to Web store and write change log in explanations.

- [デベロッパー ダッシュボード - Chrome ウェブストア](https://chrome.google.com/webstore/developer/dashboard)


## License

ライセンスは、[MITライセンス](http://www.opensource.org/licenses/mit-license.php)に準拠します。
参照元を記載の上、自己責任のもと自由に改変、利用してください。


## Copyright

Copyright (c) 2013 Yonchu.


Web Store の説明
--------------------

ニコ生アリーナは、[ニコニコ生放送](http://live.nicovideo.jp/)を便利に使うための拡張です。

* ただし、この拡張は原宿バージョンには対応していません。


## 主な機能は以下の通りです。

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


## スクリーンショット

![official](https://raw.github.com/yonchu/niconama-arena/master/img/official.png)

![autoenter](https://raw.github.com/yonchu/niconama-arena/master/img/auto_enter.png)


## 対応予定

- 通知/自動タブオープンを時間に厳密にする
- 設定を規定値に戻す
- Gateページが存在しない場合の対応
- Locale (en/ja)
- jQuery1.9
- テーマ (黒)
- 共通処理の抜き出し(名前空間/common.js)
- 一部、開場/開演日時の取得が年をまたぐ場合に対応していない
- 履歴保存時に毎回localStorageから呼び出さずキャッシュを持つ

- 自動オープンの例外設定 (UI改善)
- 公式番組は一覧画面から番組毎に自動タブオープンをON/OFF可能にする
- 放送中/放送予定ニコ生検索タブ
- 登録チャネルの放送予定
- アニメ一挙の表示

現在、ベータ版として公開中です。
その他、バグ報告や要望、ご指摘やアドバイスなどありましたら、遠慮なくお願いします。

また、正式版リリース時には広告が掲載される可能性があります。ご了承下さい。


## 変更履歴

- 2013/04/20 v0.1.0 ベータ版リリース
- 2013/04/21 v0.1.1 - 0.1.3 バグ修正


## See also

ソースコードは以下にて、MITライセンスの元公開しています。

- [yonchu/niconama-arena](https://github.com/yonchu/niconama-arena)

アイコンはニコニココモンズよりお借りしました。ありがとうございます。

- [niconicoアイコン黒 - ニコニ･コモンズ](http://commons.nicovideo.jp/material/nc58317)
