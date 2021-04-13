import React, { useState, useEffect, useContext } from 'react';
import { Box, Grid, Card } from '@material-ui/core'
import { Loader, CodeFlyout } from './Accessories'
import { appContextMap, validIdHelper } from '../utils/tools';
import { useStyles, topAndBottomHeaderPlusDrawerOpen, topAndBottomHeaderSpacing } from './styles.js';

export const SplashPage = (props) => {
  const { clientSession: { lookerUser, lookerHost } } = useContext(appContextMap[process.env.REACT_APP_PACKAGE_NAME])
  const dynamicTopBarBottomBarHeight = process.env.REACT_APP_PACKAGE_NAME === "vision" ? drawerOpen ? (topAndBottomHeaderPlusDrawerOpen) : (topAndBottomHeaderSpacing) : (topAndBottomHeaderSpacing);

  const [iFrameExists] = useState(1);
  const [height, setHeight] = useState((window.innerHeight - dynamicTopBarBottomBarHeight));
  const { staticContent: { lookerContent }, staticContent: { type } } = props;
  const classes = useStyles();
  const demoComponentType = type || 'code flyout';

  useEffect(() => {
    window.addEventListener("resize", () => setHeight((window.innerHeight - dynamicTopBarBottomBarHeight)));
  })

  useEffect(() => {
    setHeight((window.innerHeight - dynamicTopBarBottomBarHeight));
  }, [drawerOpen])

  return (
    <div
      className={`${classes.root} ${classes.positionRelative}`}
      style={{ height }}
    >
      <Card elevation={1}
        className={classes.height100Percent}
      >
        <Grid
          container
          spacing={3}
        >

          <Loader
            hide={iFrameExists}
            classes={classes}
            height={height} />

          <Box className={iFrameExists ? `` : `${classes.hidden}`}>
            <Grid container
              spacing={3}
              key={`${validIdHelper(demoComponentType + '-outerFragment')}`}
              className={`${classes.noContainerScroll}`}
            >
              <CodeFlyout {...props}
                classes={classes}
                lookerUser={lookerUser}
                height={height}
              />
              {lookerContent.map((lookerContentItem, innerIndex) => {
                const ComponentToRender = lookerContentItem.component
                return (
                  <Grid
                    key={`${validIdHelper(demoComponentType + '-innerFragment-' + innerIndex)}`}
                    item
                    sm={parseInt(lookerContentItem.gridWidth)}
                  >
                    {ComponentToRender ? <ComponentToRender {...{ lookerContentItem, classes, demoComponentType, lookerHost }} /> : ""}
                  </Grid>
                )
              })}
            </Grid>
          </Box >
        </Grid >
      </Card >
    </div >
  )
}