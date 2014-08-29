.PHONY: install build release git_release clean clean-all

FAB=fab

build:
	$(FAB) build

release:
	$(FAB) release

git_release:
	$(FAB) git_release

install:
	$(FAB) install

clean:
	$(FAB) clean

clean-all:
	$(FAB) clean_all
