【Validator-Pythonに関するメモ】

・ディレクトリ
　- testcli: テスト用のsocket.ioクライアント。validatorのstartMonitorやnopを呼び出す。
　- validator-python: Python版Validatorのモジュール

・「validator-python」の実行方法
　　- 必要なパッケージを次のコマンドでインストールする
        pip install websocket eventlet flask flask-socketio pyyaml
        (※pipは、pythonと一緒にインストールされる）
　　- 「etc/cactus」を、動作環境の「/etc/cactus」へコピーする
　　- 「validator-python/SocketIoValidator.py」を実行する

