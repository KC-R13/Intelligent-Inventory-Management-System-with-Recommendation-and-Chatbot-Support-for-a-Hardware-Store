run-db:
	docker start -a lahiru-store-db 2>nul || docker run \
	  --name lahiru-store-db \
	  -p 3306:3306 \
	  -e MYSQL_DATABASE=hardware_store \
	  -e MYSQL_ROOT_PASSWORD=password \
	  -v lahiru-store-db-volume:/var/lib/mysql \
	  -v ./scripts/init.sql:/docker-entrypoint-initdb.d/init.sql \
	  mysql:9.5.0