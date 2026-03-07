run-db:
	docker start -a lahiru-store-db 2>nul || docker run \
	  --name lahiru-store-db \
	  -p 3306:3306 \
	  -e MYSQL_DATABASE=store \
	  -e MYSQL_ROOT_PASSWORD=password \
	  -v lahiru-store-db-volume:/var/lib/mysql \
	  mysql:9.5.0