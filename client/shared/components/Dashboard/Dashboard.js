import $ from 'jquery';
import _ from 'lodash'
import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useLocation, useHistory } from "react-router-dom";
import { Grid, Card } from '@material-ui/core'
import { createMuiTheme, ThemeProvider } from '@material-ui/core/styles';
import { LookerEmbedSDK } from '@looker/embed-sdk'
import FilterBar from './FilterBar';
import EmbeddedDashboardContainer from './EmbeddedDashboardContainer';
import { Loader, CodeFlyout } from "@pbl-demo/components/Accessories";
import { useStyles, topBarBottomBarHeight, additionalHeightForFlyout } from '../styles.js';
import queryString from 'query-string';
import { appContextMap, validIdHelper } from '../../utils/tools';
import { handleTileToggle, handleVisColorToggle } from './helpers';


export default function Dashboard(props) {
  console.log('Dashboard');
  const { clientSession, clientSession: { lookerUser }, sdk, corsApiCall, theme, isReady, selectedMenuItem } = useContext(appContextMap[process.env.REACT_APP_PACKAGE_NAME]);

  const { staticContent: { lookerContent }, staticContent: { type } } = props;
  const demoComponentType = type || 'code flyout';

  const [iFrameExists, setIFrame] = useState(0);
  const [apiContent, setApiContent] = useState(undefined);
  const [dashboardObj, setDashboardObj] = useState({});
  const [dashboardOptions, setDashboardOptions] = useState({});
  const [height, setHeight] = useState((window.innerHeight - topBarBottomBarHeight));
  const [lightThemeToggleValue, setLightThemeToggleValue] = useState(true);
  const [fontThemeSelectValue, setFontThemeSelectValue] = useState("arial");
  const [expansionPanelHeight, setExpansionPanelHeight] = useState(0);
  const [horizontalLayout, setHorizontalLayout] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(true);

  let dynamicVisConfigFilterItem = _.find(lookerContent[0].filters, { label: "Dynamic Vis Config" });
  const isThemeableDashboard = dynamicVisConfigFilterItem && Object.keys(dynamicVisConfigFilterItem).length ? true : false;
  const darkThemeBackgroundColor = theme.palette.fill.main;

  const classes = useStyles();
  const location = useLocation();
  let history = useHistory();

  //condtional theming for dark mode :D
  let paletteToUse = !lightThemeToggleValue && isThemeableDashboard ?
    {
      palette: {
        type: 'dark',
        background: { paper: darkThemeBackgroundColor, default: darkThemeBackgroundColor },
      }
    }
    :
    { palette: { ...theme.palette } }

  const themeToUse = React.useMemo(
    () =>
      createMuiTheme(
        paletteToUse
      ),
    [lightThemeToggleValue, lookerContent],
  );

  const helperFunctionMapper = (event, newValue, filterItem) => {
    // console.log("helperFunctionMapper")
    // console.log({ newValue })
    // console.log({ filterItem })
    let helperResponse = filterItem.method(newValue, filterItem, dashboardOptions,
      isThemeableDashboard, lightThemeToggleValue)
    // console.log({ helperResponse })
    dashboardObj.setOptions(helperResponse)
  }

  const handleThemeChange = (event, newValue) => {
    let themeName = '';
    if (typeof newValue === "boolean") {//handleModeToggle
      setLightThemeToggleValue(newValue)
      themeName = newValue ? `light_${fontThemeSelectValue}` : `dark_${fontThemeSelectValue}`
    } else { //handleFontToggle
      themeName = lightThemeToggleValue ? `light_${newValue}` : `dark_${newValue}`
      setFontThemeSelectValue(newValue)
    }

    corsApiCall(performLookerApiCalls, [lookerContent, themeName])
  }

  useEffect(() => {
    console.log("useEffect outer");
    console.log({ lookerUser });
    console.log({ isReady });
    if (isReady) {
      console.log("useEffect inner")
      let themeName = lightThemeToggleValue ? 'light' : 'dark';
      themeName += `_${fontThemeSelectValue}`;
      corsApiCall(performLookerApiCalls, [[...lookerContent], themeName])
      setApiContent(undefined);
      setHorizontalLayout(false);
      setDrawerOpen(true);
    }
  }, [lookerUser, isReady, selectedMenuItem])

  useEffect(() => {
    if (Object.keys(dashboardOptions).length && Object.keys(dashboardObj).length
    ) {
      let tileToggleFilterItem = _.find(lookerContent[0].filters, { label: "Dynamic Tiles" })
      let visColorFilterItem = _.find(lookerContent[0].filters, { label: "Dynamic Vis Config" })

      let tileResponse, visColorResponse
      if (tileToggleFilterItem) {
        tileResponse = handleTileToggle(tileToggleFilterItem.options[0],
          tileToggleFilterItem,
          dashboardOptions);

      }

      if (visColorFilterItem) {
        visColorResponse = handleVisColorToggle(visColorFilterItem.options[0],
          visColorFilterItem,
          dashboardOptions,
          isThemeableDashboard,
          lightThemeToggleValue);
      }
      dashboardObj.setOptions({
        tileResponse,
        visColorResponse
      })
    }
  }, [dashboardOptions]);

  useEffect(() => {
    window.addEventListener("resize", () => setHeight((window.innerHeight - topBarBottomBarHeight)));
    setExpansionPanelHeight(horizontalLayout ? $('.MuiExpansionPanel-root:visible').innerHeight() || 0 : 0)
  })

  useEffect(() => {
    setHeight((window.innerHeight - topBarBottomBarHeight));
    setExpansionPanelHeight(horizontalLayout ? $('.MuiExpansionPanel-root:visible').innerHeight() || 0 : 0)
  }, [horizontalLayout])

  // needed to copy from home to make it work
  useEffect(() => {
    setApiContent(undefined);
    let modifiedBaseUrl = clientSession.lookerBaseUrl.substring(0, clientSession.lookerBaseUrl.lastIndexOf(":"));
    LookerEmbedSDK.init(modifiedBaseUrl, '/auth')
  }, []);


  const performLookerApiCalls = function (lookerContent, dynamicTheme) {

    setIFrame(0)
    $(`.embedContainer.${validIdHelper(demoComponentType)}:visible`).html('')
    lookerContent.map(async lookerContentItem => {
      //dashboard creation
      let dashboardId = lookerContentItem.id;
      let themeToUse = dynamicTheme && isThemeableDashboard ?
        dynamicTheme :
        lookerContentItem.theme ?
          lookerContentItem.theme :
          'atom_fashion';

      LookerEmbedSDK.createDashboardWithId(dashboardId)
        .appendTo(validIdHelper(`#embedContainer-${demoComponentType}-${dashboardId}`))
        .withClassName('iframe')
        .withNext()
        .withTheme(themeToUse)
        .withParams({ 'schedule_modal': 'true' })
        .on('dashboard:loaded', (event) => {
          setDashboardOptions(event.dashboard.options)
        })
        .on('drillmenu:click', drillMenuClick)
        .build()
        .connect()
        .then((dashboard) => {
          setIFrame(1)
          setDashboardObj(dashboard)
          let modifiedBaseUrl = clientSession.lookerBaseUrl.substring(0, clientSession.lookerBaseUrl.lastIndexOf(":"));
          // more robust regex solution
          // let modifiedBaseUrl = clientSession.lookerBaseUrl.replace(/:443$/, "")
          LookerEmbedSDK.init(modifiedBaseUrl)
        }).catch(error => {
          console.log({ error })
        });

      // localStorage.debug = 'looker:chatty:*'

      //api calls
      if (lookerContentItem.hasOwnProperty('filters') //&& !apiContent
      ) {
        // setApiContent(undefined)
        // get inline query from usecase file & set user attribute dynamically
        // iterating over filters
        let apiContentObj = {}
        lookerContentItem.filters.map(async (filterItem, index) => {
          if (filterItem.inlineQuery) {
            let jsonQuery = filterItem.inlineQuery
            jsonQuery.filters = {
              ...jsonQuery.filters,
              [filterItem.desiredFilterName]: lookerUser.user_attributes.brand
            };
            let lookerResponseData = await sdk.ok(sdk.run_inline_query({ result_format: filterItem.resultFormat || 'json', body: jsonQuery }));
            let queryResultsForDropdown = [];
            let desiredProperty = Object.keys(lookerResponseData[0])[0];

            for (let i = 0; i < lookerResponseData.length; i++) {
              queryResultsForDropdown.push({
                'label': lookerResponseData[i][desiredProperty],
                'trend': (lookerResponseData[i]['trend']) ? lookerResponseData[i]['trend'] : undefined
              })
            }
            apiContentObj[filterItem.component] = queryResultsForDropdown
          }
          setApiContent(apiContentObj)
        })
      }
    })
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const customFilterAction = useCallback((filterName, newFilterValue) => {
    if (Object.keys(dashboardObj).length) {
      dashboardObj.updateFilters({ [filterName]: newFilterValue })
      dashboardObj.run()
    }
  })

  const drillMenuClick = (event) => {
    if (_.includes(_.lowerCase(event.label), "view")) {
      history.push({
        pathname: 'pdfviewer',
        search: (`pdf_url=${event.url}`)
      })
      return { cancel: true }
    }
  }

  useEffect(() => {
    let params = queryString.parse(location.search);
    let paramMatchesFilterName = params[lookerContent[0].filterName] > 0 ? true : false;
    if (paramMatchesFilterName)
      customFilterAction(lookerContent[0].filterName, params[lookerContent[0].filterName])

  }, [customFilterAction, location.search, lookerContent])


  return (
    <div className={`${classes.root} demoComponent`}
      style={{ height }}
    >
      <ThemeProvider theme={themeToUse}>
        <Card elevation={1} className={`${classes.padding15} ${classes.height100Percent}`}>
          <div
            className={`${classes.root} ${classes.height100Percent}`}
          >
            <Grid
              container
              spacing={3}
            >
              <Loader
                hide={iFrameExists}
                classes={classes}
                height={height - expansionPanelHeight} />

              {lookerContent[0].hasOwnProperty("filters") ?

                < FilterBar {...props}
                  classes={classes}
                  apiContent={apiContent}
                  customFilterAction={customFilterAction}
                  // tileToggleValue={tileToggleValue}
                  // handleTileToggle={handleTileToggle}
                  // visColorToggleValue={visColorToggleValue}
                  // handleVisColorToggle={handleVisColorToggle}
                  lightThemeToggleValue={lightThemeToggleValue}
                  fontThemeSelectValue={fontThemeSelectValue}
                  handleThemeChange={handleThemeChange}
                  horizontalLayout={horizontalLayout}
                  setHorizontalLayout={setHorizontalLayout}
                  drawerOpen={drawerOpen}
                  setDrawerOpen={setDrawerOpen}
                  helperFunctionMapper={helperFunctionMapper}
                />
                :
                ''}

              <EmbeddedDashboardContainer
                classes={classes}
                lookerContent={lookerContent}
                type={demoComponentType}
                width={lookerContent[0].hasOwnProperty("filters") ? horizontalLayout ? 12 : drawerOpen ? 9 : 12 : 12}
              />

              <CodeFlyout {...props}
                classes={classes}
                lookerUser={lookerUser}
                height={height - expansionPanelHeight - additionalHeightForFlyout}
              />

            </Grid>
          </div>
        </Card>
      </ThemeProvider >
    </ div >
  )
}