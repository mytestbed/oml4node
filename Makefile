
MOCHA=./node_modules/mocha/bin/mocha
_MOCHA=./node_modules/mocha/bin/_mocha
UGLIFY=./node_modules/uglify-js/bin/uglifyjs
ISTANBUL=./node_modules/istanbul/lib/cli.js

.PHONY: test test-all-nodejs all clean coverage

all:

publish:
	git pull
	npm version patch -m "Upgrade to %s for reasons"
	git push
	#npm publish

publish-minor:
	npm version minor -m "Upgrade to %s for reasons"
	npm publish

clean:
	rm -rf ./coverage

test:
	$(MOCHA) -u tdd test

coverage: 
	$(ISTANBUL) cover $(_MOCHA) -- -u tdd -R progress test/
	$(ISTANBUL) report
	@echo "HTML report at file://$$(pwd)/coverage/lcov-report/index.html"

