#!/bin/bash

function renamePg {
	# Renames all cropped pictures based on their metadata in order to facilitate web viewage
	highestw=2304 # Highest Resolution Width
	heighsth=8602 # Highest Reolution Height
	div=1
	for(( index=10; index>0; index-=2 ))
	do
		resolutions[${index}]=$(( $heighsth / $div ))
		resolutions[$(( $index -1 ))]=$(( $highestw / $div ))
		div=$(( $div*2 ))
	done	
	p=1
	dev=2

	EXT="jpg"
	DIR_LIST1=$(ls $1 | grep -i zoom)
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
	for NAME in $DIR_LIST1; do 
		mv ${1}${NAME} ${NAMES[${b}]}
		b=$(($b+$p))
	done
	
}

function crop {
	# Divides an image into smaller images
	# It takes in the filename as an option (default is current dir)
	# ImageMagick must be installed
	EXT="jpg"
	INC=1
	#Get a list of all the images in the folder
	DIR_LIS=$(ls ${1} | grep -i .jpg)
	INTE=1
	for FILENAME in $DIR_LIS
	do
	    echo "******Cropping $FILENAME"

	    #Make a directory with the same filename (minus ".jpg" extension)
	    LENGTH=$(expr "$FILENAME" : '.*')
	    LENGTH=$((LENGTH-4))
	    DIR_TEMP=${FILENAME:0:$LENGTH}
	    mkdir $INTE
		mkdir ${INTE}/${2}

	    #Change image to various sizes 
	    convert ${1}$FILENAME -sample 2304x8704 ${INTE}/${DIR_TEMP}-zoom5.${EXT}
	    convert ${1}$FILENAME -sample 1152x4352 ${INTE}/${DIR_TEMP}-zoom4.${EXT}
	    convert ${1}$FILENAME -sample 576x2176  ${INTE}/${DIR_TEMP}-zoom3.${EXT}
	    convert ${1}$FILENAME -resize 288x1088  ${INTE}/${DIR_TEMP}-zoom2.${EXT}
		convert ${1}$FILENAME -resize 144x544  ${INTE}/${DIR_TEMP}-zoom1.${EXT}
	    convert ${1}$FILENAME -resize 170x170  ${INTE}/${2}/thumb.${EXT}

	    #Crop into size command argument images
	    #No gravity, specified size, quality and save in the directory
	    convert ${INTE}/${DIR_TEMP}-zoom1.${EXT} -quality 80% +gravity -crop 256x256 +repage -colorspace Gray ${INTE}/${2}/zoom1-${DIR_TEMP}_tile_1%04d.${EXT}
	    convert ${INTE}/${DIR_TEMP}-zoom2.${EXT} -quality 80% +gravity -crop 256x256 +repage -colorspace Gray ${INTE}/${2}/zoom2-${DIR_TEMP}_tile_1%04d.${EXT}
	    convert ${INTE}/${DIR_TEMP}-zoom3.${EXT} -quality 80% +gravity -crop 256x256 +repage -colorspace Gray ${INTE}/${2}/zoom3-${DIR_TEMP}_tile_1%04d.${EXT}
	    convert ${INTE}/${DIR_TEMP}-zoom4.${EXT} -quality 80% +gravity -crop 256x256 +repage -colorspace Gray ${INTE}/${2}/zoom4-${DIR_TEMP}_tile_1%04d.${EXT}
	    convert ${INTE}/${DIR_TEMP}-zoom5.${EXT} -quality 80% +gravity -crop 256x256 +repage -colorspace Gray ${INTE}/${2}/zoom5-${DIR_TEMP}_tile_1%04d.${EXT}
		renamePg ${INTE}/${2}

	    #Change the permissions for both directory and tile files
	    #chmod +r,-x,u+wx ${INT}
	    #chmod +r,-x,u+wx ${INT}/*_tile_*.${EXT}

	    #Delete the .png file and the original
	    rm ${INTE}/${DIR_TEMP}-zoom1.${EXT}
	    rm ${INTE}/${DIR_TEMP}-zoom2.${EXT}
	    rm ${INTE}/${DIR_TEMP}-zoom3.${EXT}
	    rm ${INTE}/${DIR_TEMP}-zoom4.${EXT}
	    rm ${INTE}/${DIR_TEMP}-zoom5.${EXT}
	    #rm $FILENAME

	    #Increment the directory name
	    INTE=$(($INTE+$INC))
	done
}

function combineThumb {
	# Combines the thumbs in the subdirectories into a resized thumb
	DIR_LIST2=$(ls $1)
	cmd=""
	int=0
	l=1
	for DIR1 in $DIR_LIST2; do 
		cmd="${cmd} ${1}${DIR1}/thumb.jpg"
		int=$(($int+$l))
	done
	echo ${cmd}
	montage -mode concatenate -tile ${int}x ${cmd} ${1}thumb.jpg
	convert ${1}thumb.jpg -resize 170x170  ${1}thumb_small.jpg
}

INC=1
#Get a list of all the images in the folder
DIRS=$(ls -d */)
INT=1
for DIR in $DIRS
do
	crop ${DIR} ${INT}/	
	INT=$(($INT+$INC))
done
DIRS=$(ls -d */)
for DIR in $DIRS
do
	combineThumb ${DIR}
done