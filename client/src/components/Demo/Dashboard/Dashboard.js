import $ from 'jquery';
import _ from 'lodash'
import React, { useState, useEffect, useContext } from 'react';
import { AppBar, Tabs, Tab, Typography, Box, Grid, CircularProgress, Card, TextField } from '@material-ui/core'
import { Autocomplete, ToggleButton, ToggleButtonGroup } from '@material-ui/lab'
import { LookerEmbedSDK } from '@looker/embed-sdk'
import CodeFlyout from '../CodeFlyout';
import rawSampleCode from '!!raw-loader!./Dashboard.js'; // eslint-disable-line import/no-webpack-loader-syntax
import useStyles from './styles.js';
import { TabPanel, a11yProps } from './helpers.js';
import { ApiHighlight, EmbedHighlight } from '../../Highlights/Highlight';
import { NumberToColoredPercent } from '../../Accessories/NumberToColoredPercent';
import AppContext from '../../../AppContext';
const { validIdHelper } = require('../../../tools');

//start of Dashboard Component
export default function Dashboard(props) {
  // console.log('Dashboard')
  //initialize state using hooks
  const [value, setValue] = useState(0);
  const [iFrameExists, setIFrame] = useState(0);
  const [apiContent, setApiContent] = useState([]);
  const [dashboardObj, setDashboardObj] = useState({});
  const [clientSideCode, setClientSideCode] = useState('');
  const [serverSideCode, setServerSideCode] = useState('');
  const [toggleValue, setToggleValue] = useState('');
  const [dashboardLayout, setDashboardLayout] = useState({});
  const { togglePayWallModal } = useContext(AppContext)

  //declare constants
  const classes = useStyles();
  const { staticContent: { lookerContent }, staticContent: { type }, activeTabValue, handleTabChange, lookerUser, lookerHost } = props;
  const codeTab = {
    type: 'code flyout', label: 'Code', id: 'codeFlyout',
    lookerContent, lookerUser, clientSideCode, serverSideCode
  }
  const tabContent = [...lookerContent, codeTab];
  const demoComponentType = type || 'code flyout';

  //handle tab change
  const handleChange = (event, newValue) => {
    handleTabChange(0);
    setValue(newValue);
  };

  const handleToggle = (event, newValue) => {
    setToggleValue(newValue)
    const filteredLayout = _.filter(dashboardLayout.dashboard_layout_components, (row) => {
      return (lookerContent[0].dynamicFieldLookUp[newValue].indexOf(row.dashboard_element_id) > -1)
    })
    const newDashboardLayout = {
      ...dashboardLayout,
      dashboard_layout_components: filteredLayout
    }
    dashboardObj.setOptions({ "layouts": [newDashboardLayout] })
  };

  /**
   * listen for lookerContent and call 
   * performLookerApiCalls and setSampleCode
  */
  useEffect(() => {
    // console.log('validIdHelper(demoComponentType + lookerContent[0].id)', validIdHelper(demoComponentType + lookerContent[0].id))
    // if (validIdHelper(demoComponentType + lookerContent[0].id) === selectedMenuItem) {
    setTimeout(() => performLookerApiCalls([...lookerContent]), 1000)
    setClientSideCode(rawSampleCode)
    // }
  }, [lookerContent, lookerUser]);


  useEffect(() => {
    if (Object.keys(dashboardLayout).length && Object.keys(dashboardObj).length && lookerContent[0].dynamicFieldLookUp) {
      handleToggle(null, Object.keys(lookerContent[0].dynamicFieldLookUp)[0])
    }
  }, [dashboardLayout]);

  /** 
   * What this function does:
   * iterate over Looker Content array referenced above and
   * calls specific endpoints and methods available from Looker Node SDK
   * and embed SDK to create the experience on this page
   */
  const performLookerApiCalls = function (lookerContent) {
    // console.log('performLookerApiCalls')
    $(`.embedContainer.${validIdHelper(demoComponentType)}:visible`).html('')
    setIFrame(0)
    setApiContent([])
    lookerContent.map(async lookerContent => {
      // console.log('lookerContent map')
      let dashboardId = lookerContent.id;
      // console.log('dashboardId ', dashboardId)
      // console.log('embed container exists??', $('#' + validIdHelper(`embedContainer-${demoComponentType}-${dashboardId}`)).length)
      // console.log('embed container html??', $('#' + validIdHelper(`embedContainer-${demoComponentType}-${dashboardId}`)).html())


      //how can test to see if it has content???
      LookerEmbedSDK.createDashboardWithId(dashboardId)
        .appendTo(validIdHelper(`#embedContainer-${demoComponentType}-${dashboardId}`))
        .withClassName('iframe')
        .withNext()
        // .withNext(lookerContent.isNext || false) //how can I make this dynamic based on prop??
        .withTheme('atom_fashion')
        .withParams({ 'schedule_modal': 'true' })
        .on('page:property:change', (event) => {
          // console.log('page property is changing!!!!')
          changeHeight(event)
        }) // dashboards-next
        .on('dashboard:loaded', (event) => {
          setDashboardLayout(event.dashboard.options.layouts[0])
        })
        // .on('drillmenu:click', (event) => {
        //   drillMenuClick(event)
        // })
        .build()
        .connect()
        .then((dashboard) => {
          setIFrame(1)
          setDashboardObj(dashboard)
          LookerEmbedSDK.init(`https://${lookerHost}.looker.com`);

        })
        .catch((error) => {
          // console.error('Connection error', error)
        })

      if (lookerContent.hasOwnProperty('filter')) {
        //get inline query from usecase file & set user attribute dynamically
        let jsonQuery = lookerContent.inlineQuery;
        jsonQuery.filters = {
          ...jsonQuery.filters,
          [lookerContent.desiredFilterName]: lookerUser.user_attributes.brand
        };
        lookerContent.inlineQuery = jsonQuery;
        let stringifiedQuery = encodeURIComponent(JSON.stringify(lookerContent.inlineQuery))
        let lookerResponse = await fetch('/runinlinequery/' + stringifiedQuery + '/json', {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json'
          }
        })
        let lookerResponseData = await lookerResponse.json();
        let queryResultsForDropdown = [];
        let desiredProperty = Object.keys(lookerResponseData.queryResults[0])[0];
        for (let i = 0; i < lookerResponseData.queryResults.length; i++) {
          queryResultsForDropdown.push({
            'label': lookerResponseData.queryResults[i][desiredProperty],
            'trend': (lookerResponseData.queryResults[i]['trend']) ? lookerResponseData.queryResults[i]['trend'] : undefined
          })
        }
        setApiContent(queryResultsForDropdown);
        if (serverSideCode.length === 0) setServerSideCode(lookerResponseData.code);
      }
    })
  }

  /**
   * update dashboard when custom filter changed
  */
  const customFilterAction = (dashboardId, filterName, newFilterValue) => {
    if (Object.keys(dashboardObj).length) {
      dashboardObj.updateFilters({ [filterName]: newFilterValue })
      dashboardObj.run()
    }
  }

  // const drillMenuClick = (event) => {

  //   const basicLookerUser = lookerUser.permission_level === 'basic' ? true : false;
  //   if (basicLookerUser) {
  //     togglePayWallModal()
  //     return { cancel: (basicLookerUser) ? true : false }
  //   }
  // }

  const changeHeight = (event) => {
    // console.log('changeHeight')
    // console.log('event', event)
  }

  /**
   * What this return  does:
   * Rendering of actual html elements,
   * this section is necessary but less relevant to looker functionality itself
   */
  return (
    <div className={`${classes.root} demoComponent`}>
      <Grid container
        spacing={3}
        key={validIdHelper(type)} >
        <div className={classes.root}>
          {iFrameExists ? '' :
            <Grid item sm={12} >
              <Card className={`${classes.card} ${classes.flexCentered}`}>
                <CircularProgress className={classes.circularProgress} />
              </Card>
            </Grid>
          }

          {/* additional loading logic, need embedContainer to exist but want it hidden until iFrame has content...*/}
          <Box className={iFrameExists ? `` : `${classes.hidden}`}>
            <AppBar position="static">
              <Tabs
                className={classes.tabs}
                value={value}
                onChange={handleChange}
                aria-label="simple tabs example">
                {tabContent.map((item, index) => (
                  <Tab
                    key={`${validIdHelper(demoComponentType + '-tab-' + index)}`}
                    label={item.label}
                    className={item.type === 'code flyout' ? `${classes.mlAuto}` : ``}
                    {...a11yProps(index)} />
                ))}
              </Tabs>
            </AppBar>
            <Box className="tabPanelContainer">
              {tabContent.map((tabContentItem, index) => (
                <TabPanel
                  key={`${validIdHelper(demoComponentType + '-tabPanel-' + index)}`}
                  value={value}
                  index={index}>
                  <Grid container>
                    {tabContentItem.type === 'code flyout' ?
                      // could this go to home/parent component
                      // so it's not in the demo component itself whatsoever
                      <CodeFlyout {...props}
                        classes={classes}
                        lookerContent={lookerContent}
                        clientSideCode={clientSideCode}
                        serverSideCode={serverSideCode}
                        lookerUser={lookerUser} />
                      :
                      <React.Fragment
                        key={`${validIdHelper(demoComponentType + '-innerFragment-' + index)}`}>
                        {tabContentItem.filter ?

                          <Grid item sm={6}>
                            <ApiHighlight>
                              <Autocomplete
                                id={`combo-box-dashboard-${lookerContent.id}`}
                                options={Array.isArray(apiContent) ?
                                  apiContent :
                                  []}
                                renderOption={(option) => (
                                  <Grid container justify="space-between">
                                    <Grid item>
                                      {option.label}
                                    </Grid>
                                    {option.trend && <Grid item>
                                      <NumberToColoredPercent
                                        val={option.trend}
                                        positive_good={true}
                                        abs_val={Math.abs(option.trend)}
                                      />
                                    </Grid>}
                                  </Grid>
                                )}
                                getOptionLabel={(option) => option.label}
                                style={{ width: 400 }}
                                onChange={(event, newValue) => {
                                  customFilterAction(tabContentItem.id, tabContentItem.filter.filterName, (newValue) ? newValue.label : '')
                                }}
                                renderInput={(params) => <TextField {...params} label={tabContentItem.filter.filterName} variant="outlined" />}
                                loadingText="Loading..."
                              />
                            </ApiHighlight>
                          </Grid> : ''
                        }
                        {tabContentItem.dynamicFieldLookUp ?
                          <Grid item sm={6}>
                            <ApiHighlight>
                              <ToggleButtonGroup
                                value={toggleValue}
                                exclusive
                                onChange={handleToggle}
                                aria-label="text alignment"
                              >
                                {Object.keys(tabContentItem.dynamicFieldLookUp).map(key => {
                                  return (
                                    <ToggleButton
                                      key={validIdHelper(`dynamicDashToggle-${key}`)}
                                      value={key} aria-label="left aligned">
                                      {key}
                                    </ToggleButton>
                                  )
                                })}
                              </ToggleButtonGroup>
                            </ApiHighlight>
                          </Grid>
                          : ''
                        }
                        <Box className={classes.w100} mt={2}>
                          <Grid item sm={12}>
                            <EmbedHighlight>
                              <div
                                className={`embedContainer ${validIdHelper(demoComponentType)}`}
                                id={validIdHelper(`embedContainer-${demoComponentType}-${tabContentItem.id}`)}
                                key={validIdHelper(`embedContainer-${demoComponentType}-${tabContentItem.id}`)}
                              >
                              </div>
                            </EmbedHighlight>
                          </Grid>
                        </Box>
                      </React.Fragment>
                    }
                  </Grid>
                </TabPanel>
              ))}
            </Box>
          </Box >
        </div>
      </Grid >
    </div >
  )
}