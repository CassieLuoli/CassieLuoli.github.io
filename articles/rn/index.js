import React, { Component } from 'react'
import readmePath from "./RN.md"
import bundlelook from './bundlelook.png'

const readfile = () => {
  return fetch(readmePath)
}

export default readfile
