import _ from 'lodash';
import React, { useState } from 'react';
import { Typography } from '@material-ui/core'
import { ToggleButton, ToggleButtonGroup } from '@material-ui/lab';
import { EmbedMethodHighlight } from '../Accessories/Highlight';
const { validIdHelper } = require('../../utils/tools');


export const ToggleVisColor = ({ classes, filterItem, helperFunctionMapper }) => {
  // console.log("ToggleVisColor")
  // console.log({ classes })
  // console.log({ filterItem })
  // console.log({ helperFunctionMapper })
  /**
   * TO DO 
   * fix initialization bug that currently requires options to be set to 1
   */
  const [visColorToggleValue, setVisColorToggleValue] = useState(filterItem ? filterItem.options[1] : "");

  return (

    <EmbedMethodHighlight classes={classes} >
      <Typography
      >{filterItem.label}</Typography>
      <ToggleButtonGroup
        value={visColorToggleValue}
        exclusive
        onChange={(event, newValue) => {
          setVisColorToggleValue(newValue)
          helperFunctionMapper(event, newValue, filterItem)
        }}
        aria-label="text alignment"
      >
        {Object.keys(filterItem.colors).map(key => {
          return (
            <ToggleButton
              key={validIdHelper(`dynamicDashVisConfigToggle-${key}`)}
              value={key} aria-label="left aligned">
              <span className={`${classes.dot}`} style={{
                backgroundColor: (filterItem.colors[key][filterItem.colors[key].length - 2]
                  || key)
              }}></span>
            </ToggleButton>
          )
        })}
      </ToggleButtonGroup>

    </EmbedMethodHighlight>
  )
}
