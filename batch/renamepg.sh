#!/bin/bash
# Sam Anzaroot
# Renames all cropped pictures based on their metadata in order to facilitate web viewage
resolutions[1]=144
resolutions[2]=538
resolutions[3]=288
resolutions[4]=1076
resolutions[5]=576
resolutions[6]=2151
resolutions[7]=1152
resolutions[8]=4301
resolutions[9]=2304
resolutions[10]=8602
p=1
dev=2

EXT="jpg"
DIR_LIST=$(ls $1 | grep -i zoom)
i=0
for (( z=1; z<=10; z+=2 ))
do
	r=$(($z+$p))
	rz=$(($r/$dev))
	for (( c=0; c<${resolutions[${r}]}; c+=256 ))
	do
		for (( d=0; d<${resolutions[${z}]}; d+=256 ))
		do
			NAMES[${i}]=${1}${rz}-${d}-${c}.${EXT}
			i=$(($i+$p))
		done
	done
done

b=0
for NAME in $DIR_LIST; do 
	mv ${1}${NAME} ${NAMES[${b}]}
	b=$(($b+$p))
done
