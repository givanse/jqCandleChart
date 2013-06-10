/**
 * jQuery plugin : Candlestick Chart
 *
 */

(function(jQuery) {
  
  // private
  var st={};
  var chHeight;
  var param;
  var shinWidth;
  var cdStage;
  var cdOffsetX;
  var shinOffsetX;
  var barWidth;

  //I wonder if there is no more good hand something (lines sharply 
  var _ajustXY = function( p ) {
    if( p%2 === 0 ) { return ( p - 0.5 ); }
    return p;
  };

  // JavaScript:The Good Parts
  var is_array = function(value) {
    return
      value && 
      typeof value === "object" &&
      typeof value.length === "number" &&
      typeof value.splice === "function" &&
      !(value.propertyIsEnumerable('length'));  
  };

  // option settings 
  var _setOption = function(options) {
    // default options
    st = $.extend({
      'width' : 400,
      'height' : 300,
      'ofX': 50,
      'ofY': 30,
      'bgColor': "#FFF",
      'cdWidth': 5,
      'cdLineColor': "#000",
      'cdUpColor': "#FFF",
      'cdDownColor': "#000",
      'voColor': "#CCC",
      'liColor': "#CCC",
      'maColor': "#00F",
      'liNum': 5,
      'upper' : 250,
      'lower' : 0,
      'autoScale' : false
      }, options);

    // (I ask the ratio of scale and vertical display area) conversion preparation of coordinate scale
    chHeight = st.height - st.ofY*2;
    param = chHeight / (st.upper  - st.lower);

    // Calculate width, the distance between the volume and width of the core from Candle 
    shinWidth = Math.floor(st.cdWidth /3);
    cdStage = st.cdWidth*2;
    cdOffsetX = st.ofX + cdStage;
    shinOffsetX = cdOffsetX + (st.cdWidth/2);
    barWidth = st.cdWidth;
  };

  // 横罫線の描画
  var _writeScale = function(ctx) {
  
    // 罫線の幅を計算
    // 上限、下限の幅を罫線数で割る
    var p = Math.floor((st.upper-st.lower)/st.liNum);

  	// Font Setting
    ctx.textAlign ="right";
    ctx.textBaseline ="middle";
    ctx.font = "normal 100 10px/2 Unknown Font, sans-serif";
    
    var l = st.liNum;
    for(var i =1; i <= l; i++) {
      ctx.beginPath();
      ctx.strokeStyle = st.liColor;
      var y = _ajustXY( st.height - ( p * i * param ) - st.ofY );
      ctx.moveTo( _ajustXY(st.ofX+1) , y );
      ctx.lineTo( _ajustXY(st.width-st.ofX) , y );
      ctx.stroke();

      // 罫線部分の値
      ctx.beginPath();
      ctx.strokeStyle = st.cdLineColor;
      ctx.strokeText( p*i + st.lower, st.ofX - 4, y, st.ofX);
    }
  };

  // Initialize <canvas>
  var _initCanvas = function (canvas) {
    var ctx = canvas.getContext('2d');
    jQuery(canvas).css("width", st.width + "px");
    jQuery(canvas).css("height", st.height + "px");
    jQuery(canvas).attr("width", st.width);
    jQuery(canvas).attr("height", st.height);

    // Background fill 
    ctx.fillStyle = st.bgColor;
    ctx.fillRect(0, 0, st.width, st.height);

    // Basic border 
    ctx.strokeStyle = st.cdLineColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo( _ajustXY(st.ofX), _ajustXY( st.ofY) );
    ctx.lineTo( _ajustXY(st.ofX), _ajustXY( st.height - st.ofY) );
    ctx.lineTo( _ajustXY(st.width - st.ofX), _ajustXY(st.height - st.ofY));
    ctx.stroke();
  };

  // vertical borders 
  var _writeTimeScale = function(ctx, label, d) {
    ctx.beginPath();
    ctx.lineWidth = 1;
    ctx.strokeStyle = st.liColor;
    // dashed line（4px）
    var x = _ajustXY(d * cdStage + shinOffsetX);
    var y = st.height - st.ofY-1;
    while( y > st.ofY ) {
      ctx.beginPath();
      ctx.moveTo( x , _ajustXY( y ));
      ctx.lineTo( x , _ajustXY( y - 4 ));
      ctx.stroke();
      y = y-8;
    }
    // rules value part 
    ctx.beginPath();
    ctx.strokeStyle = st.cdLineColor;
    ctx.textBaseline = "top";
    ctx.textAlign = "center";
    ctx.strokeText( label, x , st.height - st.ofY +4 );
  };

  // draw one candle 
  var _drawSingleCandle = function(ctx,o,c,h,l,d) {
      var opP = (o - st.lower) * param;
      var clP = (c - st.lower) * param;
      var hiP = (h - st.lower) * param;
      var loP = (l - st.lower) * param;
      
      // Drawing the core 
      ctx.lineWidth = shinWidth;
      ctx.beginPath();
      ctx.strokeStyle = st.cdLineColor;
      ctx.moveTo(_ajustXY(d * cdStage + shinOffsetX), 
                 _ajustXY(chHeight - hiP + st.ofY ));
      ctx.lineTo(_ajustXY(d * cdStage + shinOffsetX), 
                 _ajustXY(chHeight - loP + st.ofY ));
      ctx.stroke();
      ctx.lineWidth = 1;
      // Fill in black white, if cheaper closing price is higher than the opening price
      if( opP < clP ) { ctx.fillStyle = st.cdUpColor; }
      else
        ctx.fillStyle = st.cdDownColor;
      ctx.strokeStyle = st.cdLineColor;
      ctx.fillRect( _ajustXY(d * cdStage + cdOffsetX), 
                    _ajustXY(chHeight-opP + st.ofY) , st.cdWidth, opP-clP );
      ctx.strokeRect( _ajustXY(d * cdStage + cdOffsetX), 
                      _ajustXY(chHeight-opP + st.ofY) , st.cdWidth, opP-clP );
  };

  // Drawing of candlestick 
  var _drawCandles = function(canvas, data) {
    if( data.length === 0 ) return; 
    var ctx = canvas.getContext('2d');

    _writeScale(ctx);

    var l = data.length;
    for(var i = 0 ; i < l ; i++) {
      if(data[i]) {
        if(data[i][4]) {
          _writeTimeScale(ctx, data[i][4],i);
        }
        _drawSingleCandle(ctx, data[i][0], data[i][1], data[i][2], data[i][3],i);
      }
    }
  };

  // Drawing of the moving average line in the spline interpolation
  // from: jQuery.crSpline Copyright 2010, M. Ian Graham
  // http://github.com/MmmCurry/jquery.crSpline
  var _writeMovingAvg = function(canvas,data,color) {
    var ctx = canvas.getContext('2d');

    var l= data.length;
    var dotsPerSeg = cdStage/2;
    var points = [];
    var res = {};
    var seq = [];
    var numSegments;
    var px,py;

    // Catmull-Rom interpolation between p0 and p1 for previous point p_1 and later point p2
    // http://en.wikipedia.org/wiki/Cubic_Hermite_spline#Catmull.E2.80.93Rom_spline
    var interpolate = function (t, p_1, p0, p1, p2) {
      return Math.floor((t * ((2 - t) * t - 1) * p_1 +
        (t * t * (3 * t - 5) + 2) * p0 +
        t * ((4 - 3 * t) * t + 1) * p1 +
        (t - 1) * t * t * p2
        ) / 2);
    };

    // Extend this p1,p2 sequence linearly to a new p3
    var generateExtension = function (p1, p2) {
      return [
        p2[0] + (p2[0] - p1[0]),
        p2[1] + (p2[1] - p1[1])
      ];
    };

    var spline = function(t) {
      var segNum = Math.floor(t * numSegments);
      if (segNum === numSegments) {
        return {
          x: seq[seq.length-2][0],
          y: seq[seq.length-2][1]
        };
      }
      var microT = (t - segNum/numSegments) * numSegments;
      var x = interpolate(microT,
        seq[segNum][0],
        seq[segNum+1][0],
        seq[segNum+2][0],
        seq[segNum+3][0]);
      var y = interpolate(microT,
        seq[segNum][1],
        seq[segNum+1][1],
        seq[segNum+2][1],
        seq[segNum+3][1]);

      return {
        x: x,
        y: y
      };
    };

    for(var i=0; i< l; i++) {
      px = i* cdStage+ shinOffsetX;
      py = Math.floor( chHeight - (data[i] - st.lower)* param) + st.ofY;
      points.push([px,py]);
    }

    // Generate the first p_1 so the caller doesn't need to provide it
    seq.push(generateExtension(points[1], points[0]));
    seq = seq.concat(points);
    // Generate the last p2 so the caller doesn't need to provide it
    seq.push(generateExtension(seq[seq.length-2], seq[seq.length-1]));

    numSegments = seq.length - 3;
    
    ctx.lineWidth = 1;
    ctx.strokeStyle = color ? color : st.maColor;
    ctx.beginPath();
    var pos= spline(0);
    ctx.moveTo(pos.x,pos.y);

    for(var i=0; i< l; i++) {
      for(var j=0; j< dotsPerSeg; j++){
        var t = (i + j/dotsPerSeg) / l;
        var pos = spline(t);
        ctx.lineTo(pos.x, pos.y);
      }
    }
    ctx.stroke();
  };

  // Automatic setting of the lower limit, upper limit
  var _setScale = function(data) {
    var l = data.length;
    var max = Number.MIN_VALUE;
    var min = Number.MAX_VALUE;
    for(var i=0; i<l ; i++) {
      max = Math.max(max,data[i][2]);
      min = Math.min(min,data[i][3]);
    }
    // Adjust up or down as a margin of 1/5 of the difference between 
    // the upper and lower limit 
    var s = (max - min) / 5;
    max = Math.floor( (max + s) / 10) * 10;
    min = Math.floor( (min - s) / 10) * 10;
    // Parameter resetting 
    st.upper = max;
    st.lower = min;
    param = chHeight / (st.upper  - st.lower);
  };

  /**
   * Initialize Candlestick Chart
   * public method
   * Usage: jQuery(canvas).candleChart([[tickdata]], {options})
   */
  jQuery.fn.candleChart = function(data, options) {
    if(!jQuery(this).is("canvas"))
      return;
    // Is regarded as a data option, if the object argument is a matrix with one
    if(arguments.length === 1 )
      if(is_array(arguments[0])) { 
        data = arguments[0]; 
        options = {};
      } else {
        data = [];
        options = arguments[0]; 
      }
    // Lower limit, upper limit setting and options
    _setOption(options);
    if(st.autoScale && data.length > 1 )
      _setScale(data);
    // One by one processing element
    this.each(function() {
      if(jQuery(this).is("canvas")) {
        _initCanvas(this);
        _drawCandles(this, data);
      }
    });
    //method chain
    return this;
  };

  // write Trading volume
  // public method
  // Usage: jQuery(elm).ccVolume([volumedata])
  jQuery.fn.ccVolume = function(data) {
    var elm = this;
    if(!data){ return this; }
    // A book display a bar of volume
    var _writeVolumeBar = function(ctx, v, d) {
      var v = v || 0;
      ctx.fillStyle = st.voColor;
      ctx.fillRect(
        _ajustXY(d * cdStage + cdOffsetX), _ajustXY( st.height - st.ofY-1) ,
            barWidth, _ajustXY(v) *-1 );
    };

    // Drawing of volume
    var _writeVolume = function(canvas,data) {
      var ctx = canvas.getContext('2d');
      var max = Math.max.apply(Math, data );
      var param = 40 / max;      // 40pxが最大の高さ
      var l = data.length;
      for(var i = 0;i < l; i++){
        _writeVolumeBar(ctx, Math.floor(data[i]* param),i);
      }
    };

    //要素を一個ずつ処理
    elm.each(function() {
      if(jQuery(this).is("canvas")) {
        _writeVolume(this,data);
      }
    });

    //method chain
    return this;
  };

  // write (only) candlestick
  // Drawing of candlestick 
  // public method
  // Usage: jQuery(elm).ccTick([volumedata])
  jQuery.fn.ccTick = function(data) {
    var elm = this;
    if(!data){ return this; }

    // 上限・下限の自動設定
    if(st.autoScale) {
      _setScale(data);
    }

    //要素を一個ずつ処理
    elm.each(function() {
      if(jQuery(this).is("canvas")) {
        _drawCandles(this, data);
      }
    });

    //method chain
    return this;
  };

  // Display of the moving average line
  // use jquery crSpline
  //   http://github.com/MmmCurry/jquery.crSpline
  //   fork -> http://github.com/shunito/jquery.crSpline
  // public method
  // Usage: jQuery(elm).ccMA([volumedata],linecolor)
  jQuery.fn.ccMA = function(data,color) {
    var elm = this;
    if(!data){ return this; }

    //要素を一個ずつ処理
    elm.each(function() {
      if(jQuery(this).is("canvas")) {
        _writeMovingAvg(this,data,color);
      }
    });

    //method chain
    return this;
  };

  // clear chart
  // チャートの画面クリア
  // public method
  // Usage: jQuery(elm).ccClear()
  jQuery.fn.ccClear = function() {
    var elm = this;

    //要素を一個ずつ処理
    elm.each(function() {
      if(jQuery(this).is("canvas")) {
        _initCanvas(this);
      }
    });

    //method chain
    return this;
  };

  // ccStatus
  // 現在のステータス等を返す。
  // ※method chainがつながらなくなります。
  jQuery.fn.ccStatus = function() {
    return {
      'obj' : this,
      'options' : st,
      'chHeight': chHeight,
      'param': param,
      'shinWidth': shinWidth,
      'cdStage': cdStage,
      'cdOffsetX': cdOffsetX,
      'shinOffsetX': shinOffsetX,
      'barWidth':barWidth
    };
  };

})(jQuery);
//EOF
