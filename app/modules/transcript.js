define([
  // Application.
  "core/app"
],

// Map dependencies from above array.
function(app) {

  // Create a new module.
  var Transcript = app.module();
  var curSpeaker = -1;
  var speakers = ["moderator", "obama", "romney"];
  var openSentence = null;
  var openParagraph = null;
  var scrollLive = true;

  // Default model.
  Transcript.Model = Backbone.Model.extend({
  
  });

  Transcript.View = Backbone.View.extend({
    
    initialize : function() {
      app.on("message:word", this.addWord, this);
      app.on("message:sentenceEnd", this.endSentence, this);
  	},

    events : {
      "scroll" : "handleScroll"
    },
  	
    cleanup: function() {
	    app.off(null, null, this);
    },

    addWord: function(args) {
    
	    var word = args['msg'];
    
    	var s = "";

      var col=1;
    	
    	if (word["speaker"] != curSpeaker) {
    		curSpeaker = word["speaker"];
    		
    		// emit message to add chapter marker
    		app.trigger("playback:addChapter", word);

   			if(curSpeaker==0) col = 2;	//obama
    		else if(curSpeaker==2) col = 3;	//romney
    		
    		if (openSentence) this.endSentence();
    		if (openParagraph) this.endParagraph();	    		
    		
        //	this.$el.children().first().append("<div id=curParagraph class='push-" + col + " span-3 " +

    		this.$el.append("<div id=curParagraph class='push-" + col + " span-3 " +
          speakers[curSpeaker] + " transcriptParagraph'><h1 class='franklinMedIt'>" +
          speakers[curSpeaker] + "</h1><p class='metaBook gray80'></p></div><div class=clear></div>");
          
    		openParagraph = true;
    	}
    	
    	
    	if (word["sentenceStartFlag"]) this.endSentence();
    	
    	if (!openSentence) {
    		$('#curParagraph p').append("<span id=curSentence class='transcriptSentence'></span>"); // add sentence span wrapper
    		openSentence = true;
    	}
    	
    	if (!word["punctuationFlag"]) s += " "; // add leading space
    	
    	$('#curSentence').append("<span id="+word["id"]+">"+s+word["word"]+"</span>"); // add word

      // Scroll the view if needed
      if(scrollLive) {
        this.$el.stop().animate({ scrollTop: this.$el.prop("scrollHeight") }, 10);
        app.trigger("transcript:scrollTo", word["timeDiff"]); 
      }
    
    },
    
    endSentence: function(args) {
    	$('#curSentence').removeAttr('id');
    	openSentence = false;
    },
    
    endParagraph: function() {
    	$('#curParagraph').removeAttr('id');
    	openParagarph = false;
    },

    handleScroll : function() {
      // Figure out which word is at the bottom of the screen and fire an event
      var buffer = 50; // How far from the bottom the "bottom" is
      var scrolled = this.$el.scrollTop();
      var bottomLine = this.$el.scrollTop() + this.$el.height() - buffer;
      

      //$("#scrollLine").offset({"left": 0, "top": bottomLine - scrolled});

      // First loop through paragraphs
      var scrolledParagraph = null;
      var closestParagraph = null;
      var closestDistance = 1000000;
      $(".transcriptParagraph").each(function(index, el) {
        var paraTop = $(el).offset().top + scrolled;
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
        var wordTop = $(el).offset().top + scrolled;
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

      /* 
      // To debug, highlight the word that we think the transcript is scrolled to
      $(".currentlyScrolled").css("background-color", "transparent");
      $(".currentlyScrolled").removeClass("currentlyScrolled");
      scrolledWord.css("background-color", "white");
      scrolledWord.addClass("currentlyScrolled");
      */
    }
  });

  // Return the module for AMD compliance.
  return Transcript;

});
