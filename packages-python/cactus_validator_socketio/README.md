# Starting Indy Valdiator

## Starting

### Build and run containers

go to cactus/tools/docker/indy-testnet and 

```
$ cd cactus/tools/docker/indy-testnet
$ docker-compose -f ./under-construction-docker-compose.yaml up
Starting nginx     ... done
Starting validator ... done
Starting indy_pool ... done
```

Type Ctrl + C to stop these containers.

### Verify that containers are actually up

Type following in the host environemnt:

```
　$ docker ps | grep -e indy_pool -e nginx -e valipy
```
Three containers `indy_pool`, `nginx` and `valipy` must be printed.

### Start Indy validator server

Run following commands (from host environment) to log into validator container:

```
$ sudo docker exec -it validator /bin/bash
```
 and run the server using these commands:

```
$ cd /root/validator
$ pip install pyyaml
$ TEST_POOL_IP=172.16.0.2 python -m main
```

