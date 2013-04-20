.PHONY: build release install package clean clean-all

FAB=fab
NPM=npm

build:
	@$(FAB) build

release:
	@$(FAB) release

install:
	@$(NPM) install

package:
	@$(NPM) init
	@$(NPM) install underscore --save-dev
	@$(NPM) install jshint --save-dev
	@$(NPM) install grunt --save-dev
	@$(NPM) install grunt-coffee -save-dev
	@$(NPM) install grunt-contrib-uglify -save-dev
	@$(NPM) install grunt-contrib-watch -save-dev
	@$(NPM) install grunt-contrib-less -save-dev

clean:
	@$(FAB) clean

clean-all:
	@$(FAB) clean_all
