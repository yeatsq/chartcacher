var fs = require('fs-extra')
var path = require('path')
var express = require('express')
var router = express.Router()

var config = require('../../config')

var getChartProperties = require('./getChartProperties')
var transformData = require('./transformData')
var thumbnail = require('./thumbnail')
var readdirectory = require('./readdirectory')

var SUPPORT_CHARTS = ['linechart', 'barchart', 'combochart', 'piechart', 'kpi', 'scatterplot', 'treemap']

function nocache(req, res, next) {
  res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
  res.header('Expires', '-1');
  res.header('Pragma', 'no-cache');
  next();
}

function handleReq(req, res, next) {
  
  var appId = req.params.app
  var chartId = req.params.chart
  var filename = appId + '_' + chartId + '.json'
  
  getChartProperties(appId, chartId).then(function(prop) {
    // Terminate the websocket connection.
    prop[0].global.connection.ws.terminate();
    prop[0].global = null;
    
    if (SUPPORT_CHARTS.indexOf(prop.visualization) === -1) {
      return res.send('Object is not one of the support charts \n' + SUPPORT_CHARTS.join(' '))
    }
    
    // Pad out the layout with snapshot related properties.
    var data = transformData(prop[1])
    data.appId = appId

    // Render template with the chart data
    res.render('chart', { data: data }, function(err, html) {
      res.send(html)        
    })

    // Cache chart to disk
    fs.writeJson(path.join(config.chartCachePath, filename), prop[1], function() {
      thumbnail(appId, chartId)
    });
    
  })
  .catch(function(error) {
    next(error)
  })
  .done();
  
}

/* GET home page. */
router.get('/', function(req, res, next) {
  readdirectory().then(function(data) {
    
    var data = data.map(function(d) {
      return {
        title: d.appTitle,
        appId: d.appId,
        chartId: d.chartId,
        timestamp: d.timestamp,
        visualization: d.visualization
      }
    }).reduce(function(apps, line) {
      apps[line.title] = apps[line.title] || {}
      apps[line.title].charts = apps[line.title].charts || []
      apps[line.title].charts.push(line)   
      return apps;
                      
    }, {})
        
    res.render('index', {data: data})
    
  })
});

router.get('/thumbnail/:app/:chart', nocache, function(req, res) {
    
    var appId = req.params.app
    var chartId = req.params.chart
    var filename = appId + '_' + chartId + '.json'
   
    fs.readJson(path.join(config.chartCachePath, filename), function(err, obj) {
      res.render('thumbnail', { data: obj })
    })
    
})

/* App but no chart, show error */
router.get('/:app', function(req, res) {
  res.send('Please specify a chart')
});


router.get('/:app/:chart/:cache*?', function(req, res, next) {

  var filename = req.params.app + '_' + req.params.chart + '.json'
  var refresh = (req.params.cache && req.params.cache === 'nocache') ? true : false
  
  //this is hacky...
  var waitingForRequestTofinish = false

  if( refresh ) {
    waitingForRequestTofinish = true
    handleReq(req, res, next)
  }
    
  try {
    var data = fs.readJsonSync(path.join(config.chartCachePath, filename))
  } catch (error) {
    if ( error.code === 'ENOENT' ) {
      waitingForRequestTofinish = true
      handleReq(req, res, next)
    } else {
      next(error)
    }
  }
  
  // Chart is already cached - serve it up to the client  
  if ( !waitingForRequestTofinish ) {
    res.render('chart', { data: data })
  }

})

module.exports = router;