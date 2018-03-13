dev:
	@webpack --watch

server:
	@python3 -m http.server 8080

build:
	@webpack -p
