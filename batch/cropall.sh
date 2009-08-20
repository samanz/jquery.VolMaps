#!/bin/bash
INC=1
#Get a list of all the images in the folder
DIRS=$(ls -d */)
INT=1
for DIR in $DIRS
do
	./crop.sh ${DIR} ${INT}/	
	INT=$(($INT+$INC))
done
DIRS=$(ls -d */)
for DIR in $DIRS
do
	./combineThumb.sh ${DIR}
done