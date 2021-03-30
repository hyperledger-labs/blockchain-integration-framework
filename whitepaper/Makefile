PD_DEB_URL = https://github.com/jgm/pandoc/releases/download/2.9.2/pandoc-2.9.2-1-amd64.deb
PD_DEB_FILE = pandoc-2.9.2-1-amd64.deb
PD = pandoc
SECTIONS = $(sort $(wildcard ./*-a.md))
PDFLAGS = --from=markdown_mmd+yaml_metadata_block+smart+grid_tables+pipe_tables --standalone --self-contained --to=html --metadata title="" ${SECTIONS}
WK_DEB_FILE = wkhtmltox_0.12.5-1.bionic_amd64.deb
WK_DEB_URL = https://downloads.wkhtmltopdf.org/0.12/0.12.5/wkhtmltox_0.12.5-1.bionic_amd64.deb
WK = wkhtmltopdf
WKFLAGS = --dpi 150 --disable-smart-shrinking hyperledger-cactus-whitepaper.html --allow $(pwd)



.PHONY: pdf
pdf: html
	$(WK) $(WKFLAGS) - hyperledger-cactus-whitepaper.pdf

.PHONY: html
html:
	$(PD) $(PDFLAGS) > hyperledger-cactus-whitepaper.html

install-wkhtmltox:
	wget $(WK_DEB_URL)
	sudo gdebi --non-interactive $(WK_DEB_FILE)
	rm $(WK_DEB_FILE)

install-pandoc:
	wget $(PD_DEB_URL)
	sudo gdebi --non-interactive $(PD_DEB_FILE)
	rm $(PD_DEB_FILE)

install-gdebi-core:
	sudo apt-get update
	sudo apt-get install -y gdebi-core

# Tested on Ubuntu 18.04 and 20.04 only
configure: install-gdebi-core install-pandoc install-wkhtmltox
