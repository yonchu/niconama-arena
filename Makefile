.PHONY: install build release clean clean-all

FAB=fab

build:
	@$(FAB) build

release:
	@$(FAB) release

install:
	@$(FAB) install

clean:
	@$(FAB) clean

clean-all:
	@$(FAB) clean_all
