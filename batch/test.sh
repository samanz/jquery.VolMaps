#!/bin/bash
highestw=2304
heighsth=8602
div=1
resolutions[1]=144
for(( index=10; index>0; index-=2 ))
do
	resolutions[${index}]=$(( $heighsth / $div ))
	echo resolutions[${index}]=$(( $heighsth / $div ))
	resolutions[$(( $index -1 ))]=$(( $highestw / $div ))
	echo resolutions[$(( $index -1 ))]=$(( $highestw / $div ))
	div=$(( $div*2 ))
done