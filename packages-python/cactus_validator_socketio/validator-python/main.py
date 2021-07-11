from validator_socketio_module.SocketIoValidator import SocketIoValidator

if __name__ == '__main__':
    validator = SocketIoValidator()
    validator.init_indy()
    validator.run()
