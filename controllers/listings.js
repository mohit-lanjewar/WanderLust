const Listing = require("../models/listing.js");
const cloudinary = require("cloudinary").v2;

module.exports.index = async (req, res) => {
    const { category, search } = req.query; 
    let allListings;

    const filter = {};
    if (category) filter.category = category;
    if (search) filter.$or = [
        { title: new RegExp(search, "i") },
        { location: new RegExp(search, "i") },
        { country: new RegExp(search, "i") },
        { category: new RegExp(search, "i") }
    ];

    allListings = await Listing.find(filter);

    res.render("listings/index", { 
        allListings, 
        category: category || '', 
        search: search || '' 
    });
};



module.exports.renderNewForm = (req, res) => {
    res.render("listings/new.ejs");
};

module.exports.showListings = async (req, res) => {
    let { id } = req.params;
    let listing = await Listing.findById(id)
        .populate({
            path: "reviews",
            populate: { path: "author" }
        })
        .populate("owner");

    if (!listing) {
        req.flash("error", "Listing you requested for does not exist");
        return res.redirect("/listings");
    }

    res.render("listings/show.ejs", { listing });
};

module.exports.createListings = async (req, res, next) => {
    try {
        const newListing = new Listing(req.body.listing);
        newListing.owner = req.user._id;

        if (req.file) {
            // Only add image if file was uploaded
            newListing.image = {
                url: req.file.path,
                filename: req.file.filename
            };
        }

        await newListing.save();

        req.flash("success", "New Listing created");
        res.redirect("/listings");
    } catch (err) {
        console.error("Error creating listing:", err);
        req.flash("error", "Something went wrong while creating the listing.");
        res.redirect("/listings/new");
    }
};


module.exports.renderEditForm = async (req, res) => {
    const { id } = req.params;
    const listing = await Listing.findById(id);

    if (!listing) {
        req.flash("error", "Listing you requested for does not exist");
        return res.redirect("/listings");
    }

    let originalImageUrl = null;

    if (listing.image && listing.image.filename) {
        originalImageUrl = cloudinary.url(listing.image.filename, {
            width: 300,
            crop: "scale"  
        });
    }

    res.render("listings/edit.ejs", { listing, originalImageUrl });
};



module.exports.updateListing = async (req, res) => {
    let { id } = req.params;
    let listing = await Listing.findByIdAndUpdate(id, { ...req.body.listing });

    if (typeof req.file !== "undefined") {
        let url = req.file.path;
        let filename = req.file.filename;
        listing.image = { url, filename };
        await listing.save();
    }

    req.flash("success", "Listing updated");
    res.redirect(`/listings/${id}`);
};

module.exports.destroyListing = async (req, res) => {
    let { id } = req.params;
    let deleteListing = await Listing.findByIdAndDelete(id);
    console.log(deleteListing);

    req.flash("success", "Listing Deleted..");
    res.redirect("/listings");
};

module.exports.searchListings = async (req, res) => {
    const { q, category } = req.query;

    const searchRegex = q ? new RegExp(q, "i") : null;

    const filter = {};
    if (category) filter.category = category;
    if (searchRegex) filter.$or = [
        { title: searchRegex },
        { location: searchRegex },
        { country: searchRegex },
        { category: searchRegex }
    ];

    const results = await Listing.find(filter);

    res.render("listings/index", { allListings: results, searchQuery: q, category });
};
