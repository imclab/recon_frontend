define([
  // Application.
  "core/app",
  "modules/overlay",
  "modules/ref"
],

// Map dependencies from above array.
function(app, Overlay, Ref) {

  // Create a new module.
  var Transcript = app.module();
  var curSpeaker = -1;
  var speakers = ["Moderator", "Obama", "Romney"];
  var openSentence = null;
  var openParagraph = null;
  var scrollLive = true;		
  var lastScrollHeight = 0;
  var scrollAnimating = false;

  // Default model.
  Transcript.Model = Backbone.Model.extend({
  		
  });

  Transcript.View = Backbone.View.extend({
    
    initialize : function() {
      app.on("message:word", this.addWord, this);
      app.on("message:sentenceEnd", this.endSentence, this);
      app.on("body:scroll", this.handleScroll, this);
      app.on("navigation:goLive", this.reattachLiveScroll, this);

      $(window).scroll(function() {
        if(scrollLive) { this.reattachLiveScroll(-1) };
      });
  	},

    events : {
    },
  	
    cleanup: function() {
	    app.off(null, null, this);
    },

    addWord: function(args) {
    
	    var word = args['msg'];
	    
	    
    	// check if saying word
    	if ($.inArray('say', word['cat']) != -1) {
	    	app.trigger("markup:quote", {type:'quote', speaker:word['speaker']});
    	}
	    
	    // add to transcript
    	var s = "";

      var col=1;
    		
    	if (word["speaker"] != curSpeaker) {
    		curSpeaker = word["speaker"];
    		
    		// emit message to add chapter marker
    		app.trigger("playback:addChapter", {msg:word});

        this.startParagraph(curSpeaker);
    	}
    	
    	
    	if (word["sentenceStartFlag"]) this.endSentence();
    	
    	if (!openSentence) {
    		$('#curParagraph p').append("<span id=curSentence class='transcriptSentence'></span>"); // add sentence span wrapper
    		//app.trigger("transcript:sentenceOpen");	//testing for markup manager
    		openSentence = true;
    	}
    	
    	if (!word["punctuationFlag"]) s += " "; // add leading space
    	
    	$('#curSentence').append("<span id="+word["id"]+" class='transcriptWord'>"+s+word["word"]+"</span>");

      this.keepBottomSpacing();

      // Autoscroll the window the keep up with transcript
      // ----------------------------------------------------------------------
      if(scrollLive && !Ref.disableAutoScroll) {
        var scrollTo = this.transcriptBottom() - $(window).height();
        //var scrollTo = $(document).height() - $(window).height();
        if(scrollTo != lastScrollHeight) {  // Only trigger autoscroll if needed
          console.log("scrolling to: " + scrollTo);
          var duration = Math.abs(lastScrollHeight - scrollTo) * 3.0;
          scrollAnimating = true;
          //$("body").scrollTop(lastScrollHeight);
          $("body").stop().animate({ scrollTop: scrollTo}, duration, function() { scrollAnimating = false;});
          app.trigger("transcript:scrollTo", word["timeDiff"]); 
          lastScrollHeight = scrollTo;
        }
      }           
      //$('#curSentence').css("margin-bottom", $('#curSentence').height() - Ref.overlayOffsetY);
      return false;
    },
    
    endSentence: function(args) {
      // Add word count superscript to frequent words.
      // ---------------------------------------------
      // Frequent words are marked by a class named "frequentWord"
      // and have an attribute "data-wordcount" added by markupManager
      var mainEl = this.$el;
    	$('#curSentence').find('.frequentWord').each(function() {
    		$(this).css("background-color", "white");
        var count = $(this).attr("data-wordcount");
        if(count != undefined) {
          // Add a div at this point and animate it in
          var pos = $(this).position();
          var wordWidth = $(this).width();
          var lineHeight = $(this).height();
          var container = $("<div class='wordCountFrame' style='left: " + (pos.left + wordWidth) + "px; top: " + (pos.top - lineHeight/2) + "px;'></div>");
          var countDiv = $("<div class='wordCount'>" + count + "</div>");
          container.append(countDiv);
          $(this).parent().append(container);
          countDiv.animate({top: '0px'}, 300);
        }
    	});   
    
      // Close this sentence, start a new one.
    	$('#curSentence').removeAttr('id');
    	openSentence = false;
    	if (args)
	    	app.trigger("markup:sentenceSentiment", {type:'sentenceSentiment', speaker:args['msg']['speaker'], sentiment:args['msg']['sentiment']});
    },

    startParagraph : function(curSpeaker) {
      if(curSpeaker==0) col = 2;	//obama
  		else if(curSpeaker==2) col = 3;	//romney
      else col = 1; // ???
    		
  		if (openSentence) this.endSentence();
  		if (openParagraph) this.endParagraph();	    		
    		
  		this.$el.append("<div id=curParagraph class='push-" + col + " span-3 " +
                      speakers[curSpeaker] + " transcriptParagraph'><h1 class='franklinMedIt gray80'>" +
                      speakers[curSpeaker] + "</h1><p class='metaBook gray80'></p></div><div class=clear></div>");
     
      openParagraph = true;
    },

    endParagraph: function() {
      // When #curParagraph height goes to 'auto', the page collapses and scroll jumps up
      // So save the height with a temporary div!
      if($('#saveTheHeight').length == 0)
        $('body').append("<div id='saveTheHeight' style='position: absolute; width:100%; height:2px; z-index:-100; left: 0;'></div>");

      var screenBottom = $(window).scrollTop() + $(window).height();
      $('#saveTheHeight').offset({'left':0, 'top':screenBottom});
      $('#curParagraph').css('height', 'auto'); // No more offset
    	$('#curParagraph').removeAttr('id');
    	openParagraph = false;
    },
    
    // Used by markupManager to retrieve recently added words. Returns associated span.
    // Gotta do this because of asynchronous messages.
    addClassToRecentWord: function(word, className) {
	    // Backwards traversal of current sentence words.
	    // PEND This won't work if the current sentence is closed before this is called.
	  	//$('#curSentence span:last-child').prevAll().each(function() {

	  	// Searching forwards just for testing.
	  	$('#curSentence').children().each(function() {
	  		//console.log("getRecentWordEl-" + word + "-?-" + $(this).html());
		  	if($.trim($(this).text()).toLowerCase() == $.trim(word).toLowerCase()){ 
		  		//console.log("getRecentWordEl: found");
		  		$(this).addClass(className);	
		  		//return $(this);
		  	}
	  	});
	  	//return;	 
    },

    getCurSentencePosY: function() {
	    //return $('#curSentence').offset().top;	//Breaks when scrollTop of div is > 0.
	    return (this.$el.scrollTop() + $('#curParagraph').position().top + $('#curSentence').position().top);
    },
    
    keepBottomSpacing : function() {
      // Make sure there is adequate space below the current sentence
      var sentenceTop, sentenceHEight;
      if($('#curSentence').length <= 0) { sentenceTop = 0; sentenceHeight = 0; }
      else {
        sentenceTop = $('#curSentence').offset().top;
        sentenceHeight = $('#curSentence').height();
      }

      if($('#curParagraph').length > 0) {
        var newHeight = sentenceTop - $('#curParagraph').offset().top + Ref.overlayOffsetY;

        // If the sentence is too long, force a scroll
        if(sentenceHeight > Ref.overlayOffsetY) newHeight += sentenceHeight - Ref.overlayOffsetY;
        
        if(newHeight > $('#curParagraph').height())
          $('#curParagraph').height(newHeight);
      }
    },
    
    reattachLiveScroll : function(duration) {
      if(duration == null) duration = 600;
      var transcriptHeight = this.transcriptBottom();
      var scrollTo = transcriptHeight - $(window).height();
      scrollAnimating = true;
      var theRealSlimShady = this;
      if(duration > 0) {
        $("body").stop().animate({ scrollTop: scrollTo}, duration, function() {
           // If the document has grown, try again
          if(theRealSlimShady.transcriptBottom() > transcriptHeight) theRealSlimShady.reattachLiveScroll(100);
          else {
            scrollAnimating = false;
            scrollLive = true;
            app.trigger("transcript:scrollAttach", {});
          }
        });
      }
      else {
        $("body").scrollTop(scrollTo);
        scrollAnimating = false;
        scrollLive = true;
        app.trigger("transcript:scrollAttach", {});
      }

    },

    transcriptBottom : function() {
      try {
        return $('#curParagraph').offset().top + $('#curParagraph').height();
      }
      catch(e) { return 0; }
    },

    handleScroll : function() {
      // If this is a user scrolling, decide whether to break or reattach live autoscrolling
      if(!scrollAnimating) {
        var reattachThreshold = 5;
        // Note: $(document).height() is height of the HTML document,
        //       $(window).height() is the height of the viewport
        // TODO: This assumes the current sentence is appearing at the very bottom of the document
        var bottom = this.transcriptBottom() - $(window).height();
        //if($(document).height() - ($(window).scrollTop() + $(window).height()) < reattachThreshold) {
        if(Math.abs(bottom - $(window).scrollTop()) < reattachThreshold) {
          scrollLive = true;
          app.trigger("transcript:scrollAttach", {}); // So other modules like nav can respond accordingly
        }
        else {
          $(window).stop(); // Stop any scroll animation in progress
          scrollLive = false;
          app.trigger("transcript:scrollDetach", {});
        }
      }

      // Figure out which word is at the bottom of the screen and fire an event with that word's timediff
      var buffer = 50; // How far from the bottom the "bottom" is
      var scrolled = $(window).scrollTop();
      var bottomLine = $(window).scrollTop() + $(window).height() - buffer;
      
      // First loop through paragraphs
      var scrolledParagraph = null;
      var closestParagraph = null;
      var closestDistance = 1000000;
      $(".transcriptParagraph").each(function(index, el) {
        var paraTop = $(el).offset().top;
        var paraBottom = paraTop + $(el).height();

        if(bottomLine <= paraBottom && bottomLine > paraTop) {
          scrolledParagraph = $(el);
          return false; // break the each loop
        }
        else if(Math.abs(paraBottom - bottomLine) < closestDistance) {
          closestDistance = Math.abs(paraBottom - bottomLine);
          closestParagraph = $(el);
        }
      });

      if(!scrolledParagraph) 
        scrolledParagraph = closestParagraph;


      // Loop through words in this paragraph
      var scrolledWord = null;
      var closestWord = null;
      closestDistance = 1000000;
      scrolledParagraph.find("span").not(".transcriptSentence").each(function(index, el) {
        var wordTop = $(el).offset().top;
        var wordBottom = wordTop + $(el).height();
        //console.log("Bottom: " + wordBottom + " < Scrolled: " + bottomLine + " < Top: " + wordTop + "??");
        if(bottomLine < wordBottom && bottomLine > wordTop) {
          scrolledWord = $(el);
          return false; // break the each loop
        }
        else if(Math.abs(wordBottom - bottomLine) < closestDistance) {
          closestDistance = Math.abs(wordBottom - bottomLine);
          closestWord = $(el);
        }
      });
      
      if(!scrolledWord)
        scrolledWord = closestWord;

      var messageID = scrolledWord.attr('id');
      // Find the message
      // TODO: Fix this so it doens't have to search the whole collection every time
      var timeDiff = null;
      for(var i=0; i<this.options.messages.length; i++) {
        if(this.options.messages.at(i).get('id') == messageID) {
          timeDiff = this.options.messages.at(i).get('timeDiff');
          break;
        }
      }
      if(timeDiff) {
        app.trigger("transcript:scrollTo", timeDiff);
      }


      //EG Testing adjusting CSS transform perspective origin y based on scrollTop
      //this.el.style.webkitTransformOrigin = "50% "+arg+"px"; 
      //$('body').get()[0].style.webkitTransformOrigin = "50% -"+arg+"px"; 
      //console.log("handleScroll: origin = 50% "+arg+"px");
      
      //$('#overlay').get()[0].style.webkitPerspective = "1000px";     
      //$('body').get()[0].style.webkitTransformOrigin = "50% "+arg+"px"; 
      //console.log("handleScroll "+arg+" origin = "+$('#overlay').get()[0].style.webkitTransformOrigin);
    },
    
    resetToNode: function(n) {
	    
  		// clear out following text in prep for playback
  		curSpeaker = "";
  		this.endSentence();
  		this.endParagraph();
  		$('#'+n).parent().parent().parent().nextAll().andSelf().remove();
  		
    }
  });

  // Return the module for AMD compliance.
  return Transcript;

});
