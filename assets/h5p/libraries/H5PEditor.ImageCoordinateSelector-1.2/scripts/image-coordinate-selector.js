/**
 * ImageCoordinateSelector widget module
 *
 * @param {H5P.jQuery} $
 */
H5PEditor.widgets.imageCoordinateSelector = H5PEditor.ImageCoordinateSelector = (function ($) {

  /**
   * Creates an image coordinate selector.
   *
   * @class H5PEditor.ImageCoordinateSelector
   *
   * @param {Object} parent
   * @param {Object} field
   * @param {Object} params
   * @param {function} setValue
   *
   * @throws {Error} If no image field is found
   */
  function ImageCoordinateSelector(parent, field, params, setValue) {
    var self = this;

    this.parent = parent;
    this.field = field;
    this.params = params;
    this.setValue = setValue;
    this.legacyPositioning = false;
    if (params && params.legacyPositioning === true) {
      this.legacyPositioning = true;
    }

    console.log('ImageCoordinateSelector: Initializing with field.imageFieldPath:', this.field.imageFieldPath);
    console.log('ImageCoordinateSelector: Parent object:', parent);
    console.log('ImageCoordinateSelector: Field object:', field);

    this.imageField = H5PEditor.findField(this.field.imageFieldPath, this.parent);

    console.log('ImageCoordinateSelector: Found imageField:', this.imageField);

    if (this.imageField === undefined) {
      console.error('ImageCoordinateSelector: Could not find image field at path:', this.field.imageFieldPath);
      console.error('ImageCoordinateSelector: Available fields in parent:', Object.keys(this.parent));
      throw new Error('I need an image field to do my job');
    }

    var resizeText = H5PEditor.t('H5PEditor.ImageCoordinateSelector', 'resize');

    self.$container = $(H5PEditor.createFieldMarkup(this.field,
      '<div class="image-coordinate-selector">' +
        '<div class="image-coordinate-hotspot"></div>' +
      '</div>' +
      '<button aria-label="' + resizeText + '" ' +
              'title="' + resizeText + '" ' +
              'class="image-coordinate-resizer fa fa-search-plus"' +
      '></button>')
    ).addClass('no-image');

    self.$imgContainer = self.$container.find('.image-coordinate-selector').click(function (event) {
      var $this = $(this);
      var offset = $this.offset();
      var x = event.pageX - offset.left;
      var y = event.pageY - offset.top;

      var xInPercent = self.fixPercent((x / $this.width()) * 100);
      var yInPercent = self.fixPercent((y / $this.height()) * 100);

      // We don't use legacy positioning for new clicks
      self.legacyPositioning = false; 

      // Save the value
      self.saveCoordinate(xInPercent, yInPercent);
    });

    self.$imgContainer.on('transitionend', function () {
      if (self.$imgContainer.hasClass('image-coordinate-wider')) {
        self.$imgContainer.addClass('transition-complete');
      }
      else {
        self.$imgContainer.removeClass('transition-complete');
      }
    });

    self.$container.find('.image-coordinate-resizer').click(function () {
      var $this = $(this);
      if (self.$imgContainer.hasClass('image-coordinate-wider')) {
        $this.addClass('fa-search-plus');
        $this.removeClass('fa-search-minus');
        self.$imgContainer.removeClass('image-coordinate-wider');
      }
      else {
        $this.removeClass('fa-search-plus');
        $this.addClass('fa-search-minus');
        self.$imgContainer.addClass('image-coordinate-wider');
      }
    });

    self.$hotspot = self.$container.find('.image-coordinate-hotspot');

    // H5PEditor.followField() does not work for the first element in list.
    // At least not thwe way it is used in Image Hotspots. Teherfore using changes
    // array directly.
    this.imageField.changes.push(function () {
      var params = self.imageField.params;
      if (params === undefined) {
        return self.clearImage();
      }

      // Handle nested library structure and direct image fields
      var imagePath = params.path; // Direct image field
      
      // Check for library field structure (nested params)
      if (!imagePath && params.params && params.params.file && params.params.file.path) {
        imagePath = params.params.file.path; // Library field (H5P.ImageSVG, H5P.Image)
      }
      
      // Fallback for simple library structure
      if (!imagePath && params.file && params.file.path) {
        imagePath = params.file.path; // Simple library field
      }
      
      console.log('ImageCoordinateSelector: Processing image with params:', params);
      console.log('ImageCoordinateSelector: Using image path:', imagePath);
      
      if (imagePath) {
        self.updateImage(imagePath);
      } else {
        console.warn('ImageCoordinateSelector: No image path found in params');
        self.clearImage();
      }
    });

    if (self.imageField.params) {
      // Handle nested library structure and direct image fields
      var imagePath = self.imageField.params.path; // Direct image field
      
      // Check for library field structure (nested params)
      if (!imagePath && self.imageField.params.params && self.imageField.params.params.file && self.imageField.params.params.file.path) {
        imagePath = self.imageField.params.params.file.path; // Library field (H5P.ImageSVG, H5P.Image)
      }
      
      // Fallback for simple library structure
      if (!imagePath && self.imageField.params.file && self.imageField.params.file.path) {
        imagePath = self.imageField.params.file.path; // Simple library field
      }
      
      console.log('ImageCoordinateSelector: Initial image params:', self.imageField.params);
      console.log('ImageCoordinateSelector: Initial image path:', imagePath);
      
      if (imagePath) {
        self.updateImage(imagePath);
      }
    }

    // If params not set, use default values:
    if (params === undefined || params.x === undefined || params.y === undefined) {
      this.saveCoordinate(50, 50);
    }
    else {
      self.updateHotspot(self.params.x, self.params.y);
    }
  }

  /**
   * Append the field to the wrapper.
   *
   * @param {H5P.jQuery} $wrapper
   */
  ImageCoordinateSelector.prototype.appendTo = function ($wrapper) {
    this.$container.appendTo($wrapper);
  };

  /**
   * Save coordinates
   *
   * @param {Number} x Value in percent
   * @param {Number} y Value in percent
   */
  ImageCoordinateSelector.prototype.saveCoordinate = function (x, y) {
    // Save the value
    this.params = {x: x, y: y};
    if (self.legacyPositioning === true) {
      this.params.legacyPositioning = true;
    }
    this.setValue(this.field, this.params);

    // Set visual element
    this.updateHotspot(x, y);
  };

  /**
   * Update image
   *
   * @param {String} path Image path
   */
  ImageCoordinateSelector.prototype.updateImage = function (path) {
    if (this.imgPath === path) {
      return;
    }
    this.imgPath = path;

    // Remove image if present
    this.clearImage();
    // Create image
    this.$imgContainer.append('<img src="' + H5P.getPath(path, H5PEditor.contentId) + '">');
    this.$container.removeClass('no-image');
  };

  /**
   * Remove image
   */
  ImageCoordinateSelector.prototype.clearImage = function () {
    this.$imgContainer.find('img').remove();
    this.$container.addClass('no-image');
  };

  /**
   * Update visual hotspot placement
   *
   * @param {Number} x Value in percent
   * @param {Number} y Value in percent
   */
  ImageCoordinateSelector.prototype.updateHotspot = function (x, y) {
    // Set visual element
    var left = x + '%';
    var top = y + '%';
    if (!this.legacyPositioning) {
      left += ' - 5px';
      top += ' - 5px';
    }
    this.$hotspot.css({
      left: 'calc(' + left + ')',
      top: 'calc(' + top + ')',
      display: 'block'
    });
  };

  /**
   * Making sure percent is an integer between 0 and 100
   *
   * @param {Number} percent
   * @returns {Number}
   */
  ImageCoordinateSelector.prototype.fixPercent = function (percent) {
    if (isNaN(percent)) {
      percent = 50;
    }
    return percent < 0 ? 0 : (percent > 100 ? 100 : percent);
  };


  /**
   * Validate the current values. Invoked by core
   *
   * @returns {Boolean} Valid or not
   */
  ImageCoordinateSelector.prototype.validate = function () {
    return this.params !== undefined && this.params.x !== undefined && this.params.y !== undefined &&
           this.params.x >= 0 && this.params.x <= 100 &&
           this.params.y >= 0 && this.params.y <= 100;
  };

  /**
   * Remove me. Invoked by core
   */
  ImageCoordinateSelector.prototype.remove = function () {
    this.$imgContainer.remove();
  };

  return ImageCoordinateSelector;
})(H5P.jQuery);
