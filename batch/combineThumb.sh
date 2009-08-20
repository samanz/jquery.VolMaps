#!/bin/bash
# Sam Anzaroot
# Combines the thumbs in the subdirectories into a resized thumb
DIR_LIST=$(ls $1)
cmd=""
int=0
l=1
for DIR in $DIR_LIST; do 
	cmd="${cmd} ${1}${DIR}/thumb.jpg"
	int=$(($int+$l))
done
echo ${cmd}
montage -mode concatenate -tile ${int}x ${cmd} ${1}thumb.jpg
convert ${1}thumb.jpg -resize 170x170  ${1}thumb_small.jpg