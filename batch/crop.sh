#!/bin/bash
# A shell script to divide an image into smaller images
# It takes in the filename as an option (default is current dir)
# ImageMagick must be installed
EXT="jpg"
INC=1
#Get a list of all the images in the folder
DIR_LIST=$(ls ${1} | grep -i .jpg)
INT=1
for FILENAME in $DIR_LIST
do
    echo "******Cropping $FILENAME"

    #Make a directory with the same filename (minus ".jpg" extension)
    LENGTH=$(expr "$FILENAME" : '.*')
    LENGTH=$((LENGTH-4))
    DIR_TEMP=${FILENAME:0:$LENGTH}
    mkdir $INT
		mkdir ${INT}/${2}

    #Change image to various sizes 
    convert ${1}$FILENAME -sample 2304x8704 ${INT}/${DIR_TEMP}-zoom5.${EXT}
    convert ${1}$FILENAME -sample 1152x4352 ${INT}/${DIR_TEMP}-zoom4.${EXT}
    convert ${1}$FILENAME -sample 576x2176  ${INT}/${DIR_TEMP}-zoom3.${EXT}
    convert ${1}$FILENAME -resize 288x1088  ${INT}/${DIR_TEMP}-zoom2.${EXT}
	convert ${1}$FILENAME -resize 144x544  ${INT}/${DIR_TEMP}-zoom1.${EXT}
    convert ${1}$FILENAME -resize 170x170  ${INT}/${2}/thumb.${EXT}

    #Crop into size command argument images
    #No gravity, specified size, quality and save in the directory
    convert ${INT}/${DIR_TEMP}-zoom1.${EXT} -quality 80% +gravity -crop 256x256 +repage -colorspace Gray ${INT}/${2}/zoom1-${DIR_TEMP}_tile_1%04d.${EXT}
    convert ${INT}/${DIR_TEMP}-zoom2.${EXT} -quality 80% +gravity -crop 256x256 +repage -colorspace Gray ${INT}/${2}/zoom2-${DIR_TEMP}_tile_1%04d.${EXT}
    convert ${INT}/${DIR_TEMP}-zoom3.${EXT} -quality 80% +gravity -crop 256x256 +repage -colorspace Gray ${INT}/${2}/zoom3-${DIR_TEMP}_tile_1%04d.${EXT}
    convert ${INT}/${DIR_TEMP}-zoom4.${EXT} -quality 80% +gravity -crop 256x256 +repage -colorspace Gray ${INT}/${2}/zoom4-${DIR_TEMP}_tile_1%04d.${EXT}
    convert ${INT}/${DIR_TEMP}-zoom5.${EXT} -quality 80% +gravity -crop 256x256 +repage -colorspace Gray ${INT}/${2}/zoom5-${DIR_TEMP}_tile_1%04d.${EXT}
		./renamepg.sh ${INT}/${2}
		
    #Change the permissions for both directory and tile files
    #chmod +r,-x,u+wx ${INT}
    #chmod +r,-x,u+wx ${INT}/*_tile_*.${EXT}

    #Delete the .png file and the original
    rm ${INT}/${DIR_TEMP}-zoom1.${EXT}
    rm ${INT}/${DIR_TEMP}-zoom2.${EXT}
    rm ${INT}/${DIR_TEMP}-zoom3.${EXT}
    rm ${INT}/${DIR_TEMP}-zoom4.${EXT}
    rm ${INT}/${DIR_TEMP}-zoom5.${EXT}
    #rm $FILENAME
    
    #Increment the directory name
    INT=$(($INT+$INC))
done