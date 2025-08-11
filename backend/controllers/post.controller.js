// import { PrismaClient } from "@prisma/client";
// import { encodeId, decodeId } from "../lib/secure.js";
// import { handleLocalFileUploads, generateFileUrl, deleteFile } from "../middleware/multer.middleware.js";

// const prisma = new PrismaClient();

// const generateSlug = async (title, prisma, excludeId = null) => {
//     let slug = title
//         .toLowerCase()
//         .replace(/[^a-z0-9\s-]/g, "")
//         .replace(/\s+/g, "-")
//         .replace(/-+/g, "-");
//     let uniqueSlug = slug;
//     let counter = 1;

//     while (
//         await prisma.posts.findFirst({
//             where: { slug: uniqueSlug, NOT: excludeId ? { id: excludeId } : undefined },
//         })
//     ) {
//         uniqueSlug = `${slug}-${counter}`;
//         counter++;
//     }

//     return uniqueSlug;
// };

// export const createPost = async (req, res) => {
//     try {
//         const {
//             title,
//             content,
//             excerpt,
//             meta_title,
//             meta_description,
//             status = "draft",
//             post_type = "blog",
//             is_featured = false,
//         } = req.body;

//         // Check for existing slug
//         const existing = await prisma.posts.findFirst({
//             where: { slug: req.body.slug || (await generateSlug(title, prisma)) },
//         });

//         if (existing) {
//             return res.status(400).json({
//                 success: false,
//                 message: "Post slug already exists",
//             });
//         }

//         // Handle file uploads
//         let featuredImagePath = null;
//         if (req.file) {
//             featuredImagePath = req.file.path;
//         } else if (req.files?.featured_image?.[0]) {
//             featuredImagePath = req.files.featured_image[0].path;
//         }

//         const uploadedFiles = handleLocalFileUploads(req);
//         const finalFeaturedImagePath = featuredImagePath || uploadedFiles.featured_image || null;

//         const post = await prisma.posts.create({
//             data: {
//                 title,
//                 slug: req.body.slug || (await generateSlug(title, prisma)),
//                 content,
//                 excerpt,
//                 meta_title,
//                 meta_description,
//                 status,
//                 post_type,
//                 is_featured,
//                 featured_image: finalFeaturedImagePath,
//                 view_count: 0,
//                 author_id: req.user.id,
//                 published_at: status === "published" ? new Date() : null,
//                 updated_at: new Date(),
//             },
//         });

//         const featuredImageUrl = post.featured_image ? generateFileUrl(req, post.featured_image) : null;

//         res.status(201).json({
//             success: true,
//             message: "Post created successfully",
//             data: {
//                 id: encodeId(post.id),
//                 title: post.title,
//                 slug: post.slug,
//                 content: post.content,
//                 excerpt: post.excerpt,
//                 meta_title: post.meta_title,
//                 meta_description: post.meta_description,
//                 status: post.status,
//                 post_type: post.post_type,
//                 is_featured: post.is_featured,
//                 featured_image: featuredImageUrl,
//                 view_count: post.view_count,
//                 author_id: encodeId(post.author_id),
//                 published_at: post.published_at,
//                 created_at: post.created_at,
//                 updated_at: post.updated_at,
//             },
//         });
//     } catch (error) {
//         console.error("Error in createPost controller:", error);
//         res.status(500).json({
//             success: false,
//             message: "Error creating post",
//             error: error.message,
//         });
//     }
// };

// export const getPostByIdOrSlug = async (req, res) => {
//     try {
//         const { idOrSlug } = req.params;
//         const isAuthenticated = !!req.user;

//         let post;
//         const decodedId = decodeId(idOrSlug, true);
//         if (decodedId) {
//             post = await prisma.posts.findUnique({
//                 where: { id: decodedId },
//             });
//         } else {
//             post = await prisma.posts.findUnique({
//                 where: { slug: idOrSlug },
//             });
//         }

//         if (!post) {
//             return res.status(404).json({
//                 success: false,
//                 message: "Post not found",
//             });
//         }

//         if (!isAuthenticated && post.status !== "published") {
//             return res.status(403).json({
//                 success: false,
//                 message: "Post is not published",
//             });
//         }

//         if (!req.user || !["admin", "author"].includes(req.user.role)) {
//             await prisma.posts.update({
//                 where: { id: post.id },
//                 data: { view_count: { increment: 1 } },
//             });
//             post.view_count += 1;
//         }

//         res.json({
//             success: true,
//             message: "Post retrieved successfully",
//             data: {
//                 id: encodeId(post.id),
//                 title: post.title,
//                 slug: post.slug,
//                 content: post.content,
//                 excerpt: post.excerpt,
//                 meta_title: post.meta_title,
//                 meta_description: post.meta_description,
//                 status: post.status,
//                 post_type: post.post_type,
//                 is_featured: post.is_featured,
//                 featured_image: post.featured_image ? generateFileUrl(req, post.featured_image) : null,
//                 view_count: post.view_count,
//                 author_id: encodeId(post.author_id),
//                 published_at: post.published_at,
//                 created_at: post.created_at,
//                 updated_at: post.updated_at,
//             },
//         });
//     } catch (error) {
//         console.error("Error in getPostByIdOrSlug controller:", error);
//         res.status(500).json({
//             success: false,
//             message: "Error retrieving post",
//             error: error.message,
//         });
//     }
// };
// export const getAllPosts = async (req, res) => {
//     try {
//         const {
//             page = 1,
//             limit = 10,
//             sortBy = "published_at",
//             sortOrder = "desc",
//             post_type,
//         } = req.query;
//         const isAuthenticated = !!req.user;

//         const skip = (parseInt(page) - 1) * parseInt(limit);
//         const take = parseInt(limit);

//         const where = {};
//         if (post_type) where.post_type = post_type;
//         if (!isAuthenticated);

//         const [posts, total] = await Promise.all([
//             prisma.posts.findMany({
//                 where,
//                 skip,
//                 take,
//                 orderBy: { [sortBy]: sortOrder },
//             }),
//             prisma.posts.count({ where }),
//         ]);

//         res.json({
//             success: true,
//             message: "Posts retrieved successfully",
//             data: posts.map((post) => ({
//                 id: encodeId(post.id),
//                 title: post.title,
//                 slug: post.slug,
//                 content: post.content,
//                 excerpt: post.excerpt,
//                 meta_title: post.meta_title,
//                 meta_description: post.meta_description,
//                 status: post.status,
//                 post_type: post.post_type,
//                 is_featured: post.is_featured,
//                 featured_image: post.featured_image ? generateFileUrl(req, post.featured_image) : null,
//                 view_count: post.view_count,
//                 author_id: encodeId(post.author_id),
//                 published_at: post.published_at,
//                 created_at: post.created_at,
//                 updated_at: post.updated_at,
//             })),
//             meta: {
//                 total,
//                 page: parseInt(page),
//                 limit: parseInt(limit),
//                 totalPages: Math.ceil(total / limit),
//             },
//         });
//     } catch (error) {
//         console.error("Error in getAllPublishedPosts controller:", error);
//         res.status(500).json({
//             success: false,
//             message: "Error retrieving posts",
//             error: error.message,
//         });
//     }
// };

// export const getAllPublishedPosts = async (req, res) => {
//     try {
//         const {
//             page = 1,
//             limit = 10,
//             sortBy = "published_at",
//             sortOrder = "desc",
//             post_type,
//             is_featured,
//         } = req.query;
//         const isAuthenticated = !!req.user;

//         const skip = (parseInt(page) - 1) * parseInt(limit);
//         const take = parseInt(limit);

//         const where = {};
//         if (post_type) where.post_type = post_type;
//         if (is_featured !== undefined) where.is_featured = is_featured === "true";
//         if (!isAuthenticated) where.status = "published";

//         const [posts, total] = await Promise.all([
//             prisma.posts.findMany({
//                 where,
//                 skip,
//                 take,
//                 orderBy: { [sortBy]: sortOrder },
//             }),
//             prisma.posts.count({ where }),
//         ]);

//         res.json({
//             success: true,
//             message: "Posts retrieved successfully",
//             data: posts.map((post) => ({
//                 id: encodeId(post.id),
//                 title: post.title,
//                 slug: post.slug,
//                 content: post.content,
//                 excerpt: post.excerpt,
//                 meta_title: post.meta_title,
//                 meta_description: post.meta_description,
//                 status: post.status,
//                 post_type: post.post_type,
//                 is_featured: post.is_featured,
//                 featured_image: post.featured_image ? generateFileUrl(req, post.featured_image) : null,
//                 view_count: post.view_count,
//                 author_id: encodeId(post.author_id),
//                 published_at: post.published_at,
//                 created_at: post.created_at,
//                 updated_at: post.updated_at,
//             })),
//             meta: {
//                 total,
//                 page: parseInt(page),
//                 limit: parseInt(limit),
//                 totalPages: Math.ceil(total / limit),
//             },
//         });
//     } catch (error) {
//         console.error("Error in getAllPublishedPosts controller:", error);
//         res.status(500).json({
//             success: false,
//             message: "Error retrieving posts",
//             error: error.message,
//         });
//     }
// };

// export const updatePost = async (req, res) => {
//     try {
//         const { id } = req.params;
//         const {
//             title,
//             content,
//             excerpt,
//             meta_title,
//             meta_description,
//             status,
//             post_type,
//             is_featured,
//         } = req.body;
//         const decodedId = decodeId(id);

//         const existingPost = await prisma.posts.findUnique({
//             where: { id: decodedId },
//         });

//         if (!existingPost) {
//             return res.status(404).json({
//                 success: false,
//                 message: "Post not found",
//             });
//         }

//         const existing = await prisma.posts.findFirst({
//             where: {
//                 slug: req.body.slug || (title ? await generateSlug(title, prisma, decodedId) : existingPost.slug),
//                 NOT: { id: decodedId },
//             },
//         });

//         if (existing) {
//             return res.status(400).json({
//                 success: false,
//                 message: "Post slug already exists",
//             });
//         }

//         // Handle file uploads - Check multiple sources with debugging
//         let newFeaturedImagePath = null;
        
        
//         // Check if there's a single file upload
//         if (req.file && req.file.fieldname === 'featured_image') {
//             newFeaturedImagePath = req.file.path;
//         }
//         // Check if there are multiple files and one is featured_image
//         else if (req.files) {
//             if (req.files.featured_image && req.files.featured_image[0]) {
//                 newFeaturedImagePath = req.files.featured_image[0].path;
//             }
//             // Handle array format from .any() middleware
//             else if (Array.isArray(req.files)) {
//                 const featuredImageFile = req.files.find(file => file.fieldname === 'featured_image');
//                 if (featuredImageFile) {
//                     newFeaturedImagePath = featuredImageFile.path;
//                 }
//             }
//         }
        
//         // Fallback to handleLocalFileUploads if above didn't work
//         if (!newFeaturedImagePath) {
//             const uploadedFiles = handleLocalFileUploads(req);
//             newFeaturedImagePath = uploadedFiles.featured_image;
//             if (newFeaturedImagePath) {
//                 console.log('Found featured_image via handleLocalFileUploads:', newFeaturedImagePath);
//             }
//         }
        

//         const updateData = {
//             title,
//             content,
//             excerpt,
//             meta_title,
//             meta_description,
//             status,
//             post_type,
//             is_featured,
//             updated_at: new Date(),
//             published_at: status === "published" ? (existingPost.status === "published" ? existingPost.published_at : new Date()) : null,
//         };

//         // Handle featured image update
//         if (newFeaturedImagePath) {
//             // Delete the old featured image if it exists
//             if (existingPost.featured_image) {
//                 try {
//                     await deleteFile(existingPost.featured_image);
                
//                 } catch (error) {
//                     console.error(`Error deleting old featured image: ${existingPost.featured_image}`, error);
//                     // Continue with the update even if deletion fails
//                 }
//             }
//             updateData.featured_image = newFeaturedImagePath;
//         }

//         // Generate slug if title is provided
//         const slugToUse = req.body.slug || (title ? await generateSlug(title, prisma, decodedId) : undefined);

//         const post = await prisma.posts.update({
//             where: { id: decodedId },
//             data: {
//                 ...updateData,
//                 ...(slugToUse && { slug: slugToUse }), // Only update slug if we have one
//             },
//         });

//         res.json({
//             success: true,
//             message: "Post updated successfully",
//             data: {
//                 id: encodeId(post.id),
//                 title: post.title,
//                 slug: post.slug,
//                 content: post.content,
//                 excerpt: post.excerpt,
//                 meta_title: post.meta_title,
//                 meta_description: post.meta_description,
//                 status: post.status,
//                 post_type: post.post_type,
//                 is_featured: post.is_featured,
//                 featured_image: post.featured_image ? generateFileUrl(req, post.featured_image) : null,
//                 view_count: post.view_count,
//                 author_id: encodeId(post.author_id),
//                 published_at: post.published_at,
//                 created_at: post.created_at,
//                 updated_at: post.updated_at,
//             },
//         });
//     } catch (error) {
//         console.error("Error in updatePost controller:", error);
//         res.status(500).json({
//             success: false,
//             message: "Error updating post",
//             error: error.message,
//         });
//     }
// }; 


// export const deletePost = async (req, res) => {
//     try {
//         const { id } = req.params;
//         const decodedId = decodeId(id);

//         const post = await prisma.posts.findUnique({
//             where: { id: decodedId },
//         });

//         if (!post) {
//             return res.status(404).json({
//                 success: false,
//                 message: "Post not found",
//             });
//         }

//         if (post.featured_image) {
//             await deleteFile(post.featured_image);
//         }

//         await prisma.posts.delete({
//             where: { id: decodedId },
//         });

//         res.json({
//             success: true,
//             message: "Post deleted successfully",
//         });
//     } catch (error) {
//         console.error("Error in deletePost controller:", error);
//         res.status(500).json({
//             success: false,
//             message: "Error deleting post",
//             error: error.message,
//         });
//     }
// };

// export const searchPosts = async (req, res) => {
//     try {
//         const {
//             query,
//             page = 1,
//             limit = 10,
//             sortBy = "published_at",
//             sortOrder = "desc",
//             post_type,
//             is_featured,
//         } = req.query;
//         const isAuthenticated = !!req.user;

//         const skip = (parseInt(page) - 1) * parseInt(limit);
//         const take = parseInt(limit);

//         const where = {};
//         if (query) {
//             where.OR = [
//                 { title: { contains: query, mode: "insensitive" } },
//                 { content: { contains: query, mode: "insensitive" } },
//                 { excerpt: { contains: query, mode: "insensitive" } },
//                 { meta_title: { contains: query, mode: "insensitive" } },
//                 { meta_description: { contains: query, mode: "insensitive" } },
//             ];
//         }
//         if (post_type) where.post_type = post_type;
//         if (is_featured !== undefined) where.is_featured = is_featured === "true";
//         if (!isAuthenticated) where.status = "published";

//         const [posts, total] = await Promise.all([
//             prisma.posts.findMany({
//                 where,
//                 skip,
//                 take,
//                 orderBy: { [sortBy]: sortOrder },
//             }),
//             prisma.posts.count({ where }),
//         ]);

//         res.json({
//             success: true,
//             message: "Posts retrieved successfully",
//             data: posts.map((post) => ({
//                 id: encodeId(post.id),
//                 title: post.title,
//                 slug: post.slug,
//                 content: post.content,
//                 excerpt: post.excerpt,
//                 meta_title: post.meta_title,
//                 meta_description: post.meta_description,
//                 status: post.status,
//                 post_type: post.post_type,
//                 is_featured: post.is_featured,
//                 featured_image: post.featured_image ? generateFileUrl(req, post.featured_image) : null,
//                 view_count: post.view_count,
//                 author_id: encodeId(post.author_id),
//                 published_at: post.published_at,
//                 created_at: post.created_at,
//                 updated_at: post.updated_at,
//             })),
//             meta: {
//                 total,
//                 page: parseInt(page),
//                 limit: parseInt(limit),
//                 totalPages: Math.ceil(total / limit),
//             },
//         });
//     } catch (error) {
//         console.error("Error in searchPosts controller:", error);
//         res.status(500).json({
//             success: false,
//             message: "Error searching posts",
//             error: error.message,
//         });
//     }
// };

// export const getPostStatistics = async (req, res) => {
//     try {
//         const { startDate, endDate } = req.query;

//         const where = {};
//         if (startDate && endDate) {
//             where.published_at = {
//                 gte: new Date(startDate),
//                 lte: new Date(endDate),
//             };
//         }

//         const [byPostType, byStatus, byFeatured, totalViews] = await Promise.all([
//             prisma.posts.groupBy({
//                 by: ["post_type"],
//                 where,
//                 _count: { id: true },
//             }),
//             prisma.posts.groupBy({
//                 by: ["status"],
//                 where,
//                 _count: { id: true },
//             }),
//             prisma.posts.groupBy({
//                 by: ["is_featured"],
//                 where,
//                 _count: { id: true },
//             }),
//             prisma.posts.groupBy({
//                 by: ["post_type"],
//                 where,
//                 _sum: { view_count: true },
//             }),
//         ]);

//         res.json({
//             success: true,
//             message: "Post statistics retrieved successfully",
//             data: {
//                 byPostType: byPostType.map((item) => ({
//                     post_type: item.post_type,
//                     count: item._count.id,
//                 })),
//                 byStatus: byStatus.map((item) => ({
//                     status: item.status,
//                     count: item._count.id,
//                 })),
//                 byFeatured: byFeatured.map((item) => ({
//                     is_featured: item.is_featured,
//                     count: item._count.id,
//                 })),
//                 totalViewsByPostType: totalViews.map((item) => ({
//                     post_type: item.post_type,
//                     total_views: item._sum.view_count || 0,
//                 })),
//             },
//         });
//     } catch (error) {
//         console.error("Error in getPostStatistics controller:", error);
//         res.status(500).json({
//             success: false,
//             message: "Error retrieving post statistics",
//             error: error.message,
//         });
//     }
// };

// export const togglePostStatus = async (req, res) => {
//     try {
//         const { id } = req.params;
//         const { toggle } = req.body;
//         const decodedId = decodeId(id);

//         const post = await prisma.posts.findUnique({
//             where: { id: decodedId },
//         });

//         if (!post) {
//             return res.status(404).json({
//                 success: false,
//                 message: "Post not found",
//             });
//         }

//         const updateData = {};
//         if (toggle.includes("status")) {
//             const statuses = ["draft", "published", "archived"];
//             const currentIndex = statuses.indexOf(post.status);
//             const nextStatus = statuses[(currentIndex + 1) % statuses.length];
//             updateData.status = nextStatus;
//             updateData.published_at = nextStatus === "published" ? (post.status === "published" ? post.published_at : new Date()) : null;
//         }
//         if (toggle.includes("is_featured")) {
//             updateData.is_featured = !post.is_featured;
//         }
//         updateData.updated_at = new Date();

//         const updatedPost = await prisma.posts.update({
//             where: { id: decodedId },
//             data: updateData,
//         });

//         res.json({
//             success: true,
//             message: "Post status toggled successfully",
//             data: {
//                 id: encodeId(updatedPost.id),
//                 title: updatedPost.title,
//                 slug: updatedPost.slug,
//                 content: updatedPost.content,
//                 excerpt: updatedPost.excerpt,
//                 meta_title: updatedPost.meta_title,
//                 meta_description: updatedPost.meta_description,
//                 status: updatedPost.status,
//                 post_type: updatedPost.post_type,
//                 is_featured: updatedPost.is_featured,
//                 featured_image: updatedPost.featured_image ? generateFileUrl(req, updatedPost.featured_image) : null,
//                 view_count: updatedPost.view_count,
//                 author_id: encodeId(updatedPost.author_id),
//                 published_at: updatedPost.published_at,
//                 created_at: updatedPost.created_at,
//                 updated_at: updatedPost.updated_at,
//             },
//         });
//     } catch (error) {
//         console.error("Error in togglePostStatus controller:", error);
//         res.status(500).json({
//             success: false,
//             message: "Error toggling post status",
//             error: error.message,
//         });
//     }
// };

// export const getPostByType = async (req, res) => {
//     try {
//         const {
//             post_type,
//             page = 1,
//             limit = 10,
//             sortBy = "published_at",
//             sortOrder = "desc",
//             is_featured,
//         } = req.query;
//         const isAuthenticated = !!req.user;

//         if (!post_type) {
//             return res.status(400).json({
//                 success: false,
//                 message: "Post type is required",
//             });
//         }

//         const validPostTypes = ["blog", "news", "announcement"];
//         if (!validPostTypes.includes(post_type)) {
//             return res.status(400).json({
//                 success: false,
//                 message: `Invalid post type. Must be one of: ${validPostTypes.join(", ")}`,
//             });
//         }

//         const skip = (parseInt(page) - 1) * parseInt(limit);
//         const take = parseInt(limit);

//         const where = { post_type };
//         if (is_featured !== undefined) where.is_featured = is_featured === "true";
//         if (!isAuthenticated) where.status = "published";

//         const [posts, total] = await Promise.all([
//             prisma.posts.findMany({
//                 where,
//                 skip,
//                 take,
//                 orderBy: { [sortBy]: sortOrder },
//             }),
//             prisma.posts.count({ where }),
//         ]);

//         res.json({
//             success: true,
//             message: `Posts for type ${post_type} retrieved successfully`,
//             data: posts.map((post) => ({
//                 id: encodeId(post.id),
//                 title: post.title,
//                 slug: post.slug,
//                 content: post.content,
//                 excerpt: post.excerpt,
//                 meta_title: post.meta_title,
//                 meta_description: post.meta_description,
//                 status: post.status,
//                 post_type: post.post_type,
//                 is_featured: post.is_featured,
//                 featured_image: post.featured_image ? generateFileUrl(req, post.featured_image) : null,
//                 view_count: post.view_count,
//                 author_id: encodeId(post.author_id),
//                 published_at: post.published_at,
//                 created_at: post.created_at,
//                 updated_at: post.updated_at,
//             })),
//             meta: {
//                 total,
//                 page: parseInt(page),
//                 limit: parseInt(limit),
//                 totalPages: Math.ceil(total / limit),
//                 post_type,
//             },
//         });
//     } catch (error) {
//         console.error("Error in getPostByType controller:", error);
//         res.status(500).json({
//             success: false,
//             message: "Error retrieving posts by type",
//             error: error.message,
//         });
//     }
// };

// export const getPostByStatus = async (req, res) => {
//     try {
//         const {
//             status,
//             page = 1,
//             limit = 10,
//             sortBy = "published_at",
//             sortOrder = "desc",
//             post_type,
//             is_featured,
//         } = req.query;
//         const isAuthenticated = !!req.user;

//         if (!status) {
//             return res.status(400).json({
//                 success: false,
//                 message: "Status is required",
//             });
//         }

//         const validStatuses = ["draft", "published", "archived"];
//         if (!validStatuses.includes(status)) {
//             return res.status(400).json({
//                 success: false,
//                 message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
//             });
//         }

//         if (!isAuthenticated && status !== "published") {
//             return res.status(403).json({
//                 success: false,
//                 message: `Unauthorized to access ${status} posts`,
//             });
//         }

//         const skip = (parseInt(page) - 1) * parseInt(limit);
//         const take = parseInt(limit);

//         const where = { status };
//         if (post_type) where.post_type = post_type;
//         if (is_featured !== undefined) where.is_featured = is_featured === "true";

//         const [posts, total] = await Promise.all([
//             prisma.posts.findMany({
//                 where,
//                 skip,
//                 take,
//                 orderBy: { [sortBy]: sortOrder },
//             }),
//             prisma.posts.count({ where }),
//         ]);

//         res.json({
//             success: true,
//             message: `Posts for status ${status} retrieved successfully`,
//             data: posts.map((post) => ({
//                 id: encodeId(post.id),
//                 title: post.title,
//                 slug: post.slug,
//                 content: post.content,
//                 excerpt: post.excerpt,
//                 meta_title: post.meta_title,
//                 meta_description: post.meta_description,
//                 status: post.status,
//                 post_type: post.post_type,
//                 is_featured: post.is_featured,
//                 featured_image: post.featured_image ? generateFileUrl(req, post.featured_image) : null,
//                 view_count: post.view_count,
//                 author_id: encodeId(post.author_id),
//                 published_at: post.published_at,
//                 created_at: post.created_at,
//                 updated_at: post.updated_at,
//             })),
//             meta: {
//                 total,
//                 page: parseInt(page),
//                 limit: parseInt(limit),
//                 totalPages: Math.ceil(total / limit),
//                 status,
//             },
//         });
//     } catch (error) {
//         console.error("Error in getPostByStatus controller:", error);
//         res.status(500).json({
//             success: false,
//             message: "Error retrieving posts by status",
//             error: error.message,
//         });
//     }
// };



import { PrismaClient } from "@prisma/client";
import { encodeId, decodeId } from "../lib/secure.js";
import { handleLocalFileUploads, generateFileUrl, deleteFile } from "../middleware/multer.middleware.js";

const prisma = new PrismaClient();

const generateSlug = async (title, prisma, excludeId = null) => {
    let slug = title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-");
    let uniqueSlug = slug;
    let counter = 1;

    while (
        await prisma.posts.findFirst({
            where: { slug: uniqueSlug, NOT: excludeId ? { id: excludeId } : undefined },
        })
    ) {
        uniqueSlug = `${slug}-${counter}`;
        counter++;
    }

    return uniqueSlug;
};

export const createPost = async (req, res) => {
    try {
        const {
            title,
            content,
            excerpt,
            meta_title,
            meta_description,
            status = "draft",
            post_type = "blog",
            is_featured = false,
        } = req.body;

        // Check for existing slug
        const existing = await prisma.posts.findFirst({
            where: { slug: req.body.slug || (await generateSlug(title, prisma)) },
        });

        if (existing) {
            return res.status(400).json({
                success: false,
                message: "Post slug already exists",
            });
        }

        // Handle file uploads
        let featuredImagePath = null;
        if (req.file) {
            featuredImagePath = req.file.path;
        } else if (req.files?.featured_image?.[0]) {
            featuredImagePath = req.files.featured_image[0].path;
        }

        const uploadedFiles = handleLocalFileUploads(req);
        const finalFeaturedImagePath = featuredImagePath || uploadedFiles.featured_image || null;

        const post = await prisma.posts.create({
            data: {
                title,
                slug: req.body.slug || (await generateSlug(title, prisma)),
                content,
                excerpt,
                meta_title,
                meta_description,
                status,
                post_type,
                is_featured: typeof is_featured === 'string' ? is_featured === 'true' : Boolean(is_featured),
                featured_image: finalFeaturedImagePath,
                view_count: 0,
                author_id: req.user.id,
                published_at: status === "published" ? new Date() : null,
                updated_at: new Date(),
            },
        });

        const featuredImageUrl = post.featured_image ? generateFileUrl(req, post.featured_image) : null;

        res.status(201).json({
            success: true,
            message: "Post created successfully",
            data: {
                id: encodeId(post.id),
                title: post.title,
                slug: post.slug,
                content: post.content,
                excerpt: post.excerpt,
                meta_title: post.meta_title,
                meta_description: post.meta_description,
                status: post.status,
                post_type: post.post_type,
                is_featured: post.is_featured,
                featured_image: featuredImageUrl,
                view_count: post.view_count,
                author_id: encodeId(post.author_id),
                published_at: post.published_at,
                created_at: post.created_at,
                updated_at: post.updated_at,
            },
        });
    } catch (error) {
        console.error("Error in createPost controller:", error);
        res.status(500).json({
            success: false,
            message: "Error creating post",
            error: error.message,
        });
    }
};

export const getPostByIdOrSlug = async (req, res) => {
    try {
        const { idOrSlug } = req.params;
        const isAuthenticated = !!req.user;

        let post;
        let decodedId = null;
        try {
            decodedId = decodeId(idOrSlug);
        } catch {
            decodedId = null;
        }
        if (decodedId) {
            post = await prisma.posts.findUnique({ where: { id: decodedId } });
        } else {
            post = await prisma.posts.findUnique({ where: { slug: idOrSlug } });
        }

        if (!post) {
            return res.status(404).json({
                success: false,
                message: "Post not found",
            });
        }

        if (!isAuthenticated && post.status !== "published") {
            return res.status(403).json({
                success: false,
                message: "Post is not published",
            });
        }

        if (!req.user || req.user.role !== "admin") {
            await prisma.posts.update({
                where: { id: post.id },
                data: { view_count: { increment: 1 } },
            });
            post.view_count += 1;
        }

        res.json({
            success: true,
            message: "Post retrieved successfully",
            data: {
                id: encodeId(post.id),
                title: post.title,
                slug: post.slug,
                content: post.content,
                excerpt: post.excerpt,
                meta_title: post.meta_title,
                meta_description: post.meta_description,
                status: post.status,
                post_type: post.post_type,
                is_featured: post.is_featured,
                featured_image: post.featured_image ? generateFileUrl(req, post.featured_image) : null,
                view_count: post.view_count,
                author_id: encodeId(post.author_id),
                published_at: post.published_at,
                created_at: post.created_at,
                updated_at: post.updated_at,
            },
        });
    } catch (error) {
        console.error("Error in getPostByIdOrSlug controller:", error);
        res.status(500).json({
            success: false,
            message: "Error retrieving post",
            error: error.message,
        });
    }
};
export const getAllPosts = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            sortBy = "published_at",
            sortOrder = "desc",
            post_type,
        } = req.query;
        const isAuthenticated = !!req.user;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        const where = {};
        if (post_type) where.post_type = post_type;
        if (!isAuthenticated);

        const [posts, total] = await Promise.all([
            prisma.posts.findMany({
                where,
                skip,
                take,
                orderBy: { [sortBy]: sortOrder },
            }),
            prisma.posts.count({ where }),
        ]);

        res.json({
            success: true,
            message: "Posts retrieved successfully",
            data: posts.map((post) => ({
                id: encodeId(post.id),
                title: post.title,
                slug: post.slug,
                content: post.content,
                excerpt: post.excerpt,
                meta_title: post.meta_title,
                meta_description: post.meta_description,
                status: post.status,
                post_type: post.post_type,
                is_featured: post.is_featured,
                featured_image: post.featured_image ? generateFileUrl(req, post.featured_image) : null,
                view_count: post.view_count,
                author_id: encodeId(post.author_id),
                published_at: post.published_at,
                created_at: post.created_at,
                updated_at: post.updated_at,
            })),
            meta: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error("Error in getAllPublishedPosts controller:", error);
        res.status(500).json({
            success: false,
            message: "Error retrieving posts",
            error: error.message,
        });
    }
};

export const getAllPublishedPosts = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            sortBy = "published_at",
            sortOrder = "desc",
            post_type,
            is_featured,
        } = req.query;
        const isAuthenticated = !!req.user;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        const where = {};
        if (post_type) where.post_type = post_type;
        if (is_featured !== undefined) where.is_featured = is_featured === "true";
        if (!isAuthenticated) where.status = "published";

        const [posts, total] = await Promise.all([
            prisma.posts.findMany({
                where,
                skip,
                take,
                orderBy: { [sortBy]: sortOrder },
            }),
            prisma.posts.count({ where }),
        ]);

        res.json({
            success: true,
            message: "Posts retrieved successfully",
            data: posts.map((post) => ({
                id: encodeId(post.id),
                title: post.title,
                slug: post.slug,
                content: post.content,
                excerpt: post.excerpt,
                meta_title: post.meta_title,
                meta_description: post.meta_description,
                status: post.status,
                post_type: post.post_type,
                is_featured: post.is_featured,
                featured_image: post.featured_image ? generateFileUrl(req, post.featured_image) : null,
                view_count: post.view_count,
                author_id: encodeId(post.author_id),
                published_at: post.published_at,
                created_at: post.created_at,
                updated_at: post.updated_at,
            })),
            meta: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error("Error in getAllPublishedPosts controller:", error);
        res.status(500).json({
            success: false,
            message: "Error retrieving posts",
            error: error.message,
        });
    }
};

export const updatePost = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            title,
            content,
            excerpt,
            meta_title,
            meta_description,
            status,
            post_type,
            is_featured,
        } = req.body;
        let decodedId;
        try {
            decodedId = decodeId(id);
        } catch {
            return res.status(404).json({ success: false, message: "Post not found" });
        }

        const existingPost = await prisma.posts.findUnique({
            where: { id: decodedId },
        });

        if (!existingPost) {
            return res.status(404).json({
                success: false,
                message: "Post not found",
            });
        }

        const existing = await prisma.posts.findFirst({
            where: {
                slug: req.body.slug || (title ? await generateSlug(title, prisma, decodedId) : existingPost.slug),
                NOT: { id: decodedId },
            },
        });

        if (existing) {
            return res.status(400).json({
                success: false,
                message: "Post slug already exists",
            });
        }

        // Handle file uploads - Check multiple sources with debugging
        let newFeaturedImagePath = null;
        
        
        // Check if there's a single file upload
        if (req.file && req.file.fieldname === 'featured_image') {
            newFeaturedImagePath = req.file.path;
        }
        // Check if there are multiple files and one is featured_image
        else if (req.files) {
            if (req.files.featured_image && req.files.featured_image[0]) {
                newFeaturedImagePath = req.files.featured_image[0].path;
            }
            // Handle array format from .any() middleware
            else if (Array.isArray(req.files)) {
                const featuredImageFile = req.files.find(file => file.fieldname === 'featured_image');
                if (featuredImageFile) {
                    newFeaturedImagePath = featuredImageFile.path;
                }
            }
        }
        
        // Fallback to handleLocalFileUploads if above didn't work
        if (!newFeaturedImagePath) {
            const uploadedFiles = handleLocalFileUploads(req);
            newFeaturedImagePath = uploadedFiles.featured_image;
            if (newFeaturedImagePath) {
                console.log('Found featured_image via handleLocalFileUploads:', newFeaturedImagePath);
            }
        }
        

        const updateData = {
            title,
            content,
            excerpt,
            meta_title,
            meta_description,
            status,
            post_type,
            is_featured,
            updated_at: new Date(),
            published_at: status === "published" ? (existingPost.status === "published" ? existingPost.published_at : new Date()) : null,
        };

        // Handle featured image update
        if (newFeaturedImagePath) {
            // Delete the old featured image if it exists
            if (existingPost.featured_image) {
                try {
                    await deleteFile(existingPost.featured_image);
                
                } catch (error) {
                    console.error(`Error deleting old featured image: ${existingPost.featured_image}`, error);
                    // Continue with the update even if deletion fails
                }
            }
            updateData.featured_image = newFeaturedImagePath;
        }

        // Generate slug if title is provided
        const slugToUse = req.body.slug || (title ? await generateSlug(title, prisma, decodedId) : undefined);

        const post = await prisma.posts.update({
            where: { id: decodedId },
            data: {
                ...updateData,
                ...(slugToUse && { slug: slugToUse }), // Only update slug if we have one
            },
        });

        res.json({
            success: true,
            message: "Post updated successfully",
            data: {
                id: encodeId(post.id),
                title: post.title,
                slug: post.slug,
                content: post.content,
                excerpt: post.excerpt,
                meta_title: post.meta_title,
                meta_description: post.meta_description,
                status: post.status,
                post_type: post.post_type,
                is_featured: post.is_featured,
                featured_image: post.featured_image ? generateFileUrl(req, post.featured_image) : null,
                view_count: post.view_count,
                author_id: encodeId(post.author_id),
                published_at: post.published_at,
                created_at: post.created_at,
                updated_at: post.updated_at,
            },
        });
    } catch (error) {
        console.error("Error in updatePost controller:", error);
        res.status(500).json({
            success: false,
            message: "Error updating post",
            error: error.message,
        });
    }
}; 


export const deletePost = async (req, res) => {
    try {
        const { id } = req.params;
        let decodedId;
        try {
            decodedId = decodeId(id);
        } catch {
            return res.status(404).json({ success: false, message: "Post not found" });
        }

        const post = await prisma.posts.findUnique({
            where: { id: decodedId },
        });

        if (!post) {
            return res.status(404).json({
                success: false,
                message: "Post not found",
            });
        }

        if (post.featured_image) {
            await deleteFile(post.featured_image);
        }

        await prisma.posts.delete({
            where: { id: decodedId },
        });

        res.json({
            success: true,
            message: "Post deleted successfully",
        });
    } catch (error) {
        console.error("Error in deletePost controller:", error);
        res.status(500).json({
            success: false,
            message: "Error deleting post",
            error: error.message,
        });
    }
};

export const searchPosts = async (req, res) => {
    try {
        const {
            query,
            page = 1,
            limit = 10,
            sortBy = "published_at",
            sortOrder = "desc",
            post_type,
            is_featured,
        } = req.query;
        const isAuthenticated = !!req.user;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        const where = {};
        if (query) {
            where.OR = [
                { title: { contains: query } },
                { content: { contains: query } },
                { excerpt: { contains: query } },
                { meta_title: { contains: query } },
                { meta_description: { contains: query } },
            ];
        }
        if (post_type) where.post_type = post_type;
        if (is_featured !== undefined) where.is_featured = is_featured === "true";
        if (!isAuthenticated) where.status = "published";

        const [posts, total] = await Promise.all([
            prisma.posts.findMany({
                where,
                skip,
                take,
                orderBy: { [sortBy]: sortOrder },
            }),
            prisma.posts.count({ where }),
        ]);

        res.json({
            success: true,
            message: "Posts retrieved successfully",
            data: posts.map((post) => ({
                id: encodeId(post.id),
                title: post.title,
                slug: post.slug,
                content: post.content,
                excerpt: post.excerpt,
                meta_title: post.meta_title,
                meta_description: post.meta_description,
                status: post.status,
                post_type: post.post_type,
                is_featured: post.is_featured,
                featured_image: post.featured_image ? generateFileUrl(req, post.featured_image) : null,
                view_count: post.view_count,
                author_id: encodeId(post.author_id),
                published_at: post.published_at,
                created_at: post.created_at,
                updated_at: post.updated_at,
            })),
            meta: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error("Error in searchPosts controller:", error);
        res.status(500).json({
            success: false,
            message: "Error searching posts",
            error: error.message,
        });
    }
};

export const getPostStatistics = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        const where = {};
        if (startDate && endDate) {
            where.published_at = {
                gte: new Date(startDate),
                lte: new Date(endDate),
            };
        }

        const [byPostType, byStatus, byFeatured, totalViews] = await Promise.all([
            prisma.posts.groupBy({
                by: ["post_type"],
                where,
                _count: { id: true },
            }),
            prisma.posts.groupBy({
                by: ["status"],
                where,
                _count: { id: true },
            }),
            prisma.posts.groupBy({
                by: ["is_featured"],
                where,
                _count: { id: true },
            }),
            prisma.posts.groupBy({
                by: ["post_type"],
                where,
                _sum: { view_count: true },
            }),
        ]);

        res.json({
            success: true,
            message: "Post statistics retrieved successfully",
            data: {
                byPostType: byPostType.map((item) => ({
                    post_type: item.post_type,
                    count: item._count.id,
                })),
                byStatus: byStatus.map((item) => ({
                    status: item.status,
                    count: item._count.id,
                })),
                byFeatured: byFeatured.map((item) => ({
                    is_featured: item.is_featured,
                    count: item._count.id,
                })),
                totalViewsByPostType: totalViews.map((item) => ({
                    post_type: item.post_type,
                    total_views: item._sum.view_count || 0,
                })),
            },
        });
    } catch (error) {
        console.error("Error in getPostStatistics controller:", error);
        res.status(500).json({
            success: false,
            message: "Error retrieving post statistics",
            error: error.message,
        });
    }
};

export const togglePostStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { toggle } = req.body;
        let decodedId;
        try {
            decodedId = decodeId(id);
        } catch {
            return res.status(404).json({ success: false, message: "Post not found" });
        }

        const post = await prisma.posts.findUnique({
            where: { id: decodedId },
        });

        if (!post) {
            return res.status(404).json({
                success: false,
                message: "Post not found",
            });
        }

        const updateData = {};
        if (toggle.includes("status")) {
            const statuses = ["draft", "published", "archived"];
            const currentIndex = statuses.indexOf(post.status);
            const nextStatus = statuses[(currentIndex + 1) % statuses.length];
            updateData.status = nextStatus;
            updateData.published_at = nextStatus === "published" ? (post.status === "published" ? post.published_at : new Date()) : null;
        }
        if (toggle.includes("is_featured")) {
            updateData.is_featured = !post.is_featured;
        }
        updateData.updated_at = new Date();

        const updatedPost = await prisma.posts.update({
            where: { id: decodedId },
            data: updateData,
        });

        res.json({
            success: true,
            message: "Post status toggled successfully",
            data: {
                id: encodeId(updatedPost.id),
                title: updatedPost.title,
                slug: updatedPost.slug,
                content: updatedPost.content,
                excerpt: updatedPost.excerpt,
                meta_title: updatedPost.meta_title,
                meta_description: updatedPost.meta_description,
                status: updatedPost.status,
                post_type: updatedPost.post_type,
                is_featured: updatedPost.is_featured,
                featured_image: updatedPost.featured_image ? generateFileUrl(req, updatedPost.featured_image) : null,
                view_count: updatedPost.view_count,
                author_id: encodeId(updatedPost.author_id),
                published_at: updatedPost.published_at,
                created_at: updatedPost.created_at,
                updated_at: updatedPost.updated_at,
            },
        });
    } catch (error) {
        console.error("Error in togglePostStatus controller:", error);
        res.status(500).json({
            success: false,
            message: "Error toggling post status",
            error: error.message,
        });
    }
};

export const getPostByType = async (req, res) => {
    try {
        const {
            post_type,
            page = 1,
            limit = 10,
            sortBy = "published_at",
            sortOrder = "desc",
            is_featured,
        } = req.query;
        const isAuthenticated = !!req.user;

        if (!post_type) {
            return res.status(400).json({
                success: false,
                message: "Post type is required",
            });
        }

        const validPostTypes = ["blog", "news", "announcement"];
        if (!validPostTypes.includes(post_type)) {
            return res.status(400).json({
                success: false,
                message: `Invalid post type. Must be one of: ${validPostTypes.join(", ")}`,
            });
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        const where = { post_type };
        if (is_featured !== undefined) where.is_featured = is_featured === "true";
        if (!isAuthenticated) where.status = "published";

        const [posts, total] = await Promise.all([
            prisma.posts.findMany({
                where,
                skip,
                take,
                orderBy: { [sortBy]: sortOrder },
            }),
            prisma.posts.count({ where }),
        ]);

        res.json({
            success: true,
            message: `Posts for type ${post_type} retrieved successfully`,
            data: posts.map((post) => ({
                id: encodeId(post.id),
                title: post.title,
                slug: post.slug,
                content: post.content,
                excerpt: post.excerpt,
                meta_title: post.meta_title,
                meta_description: post.meta_description,
                status: post.status,
                post_type: post.post_type,
                is_featured: post.is_featured,
                featured_image: post.featured_image ? generateFileUrl(req, post.featured_image) : null,
                view_count: post.view_count,
                author_id: encodeId(post.author_id),
                published_at: post.published_at,
                created_at: post.created_at,
                updated_at: post.updated_at,
            })),
            meta: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit),
                post_type,
            },
        });
    } catch (error) {
        console.error("Error in getPostByType controller:", error);
        res.status(500).json({
            success: false,
            message: "Error retrieving posts by type",
            error: error.message,
        });
    }
};

export const getPostByStatus = async (req, res) => {
    try {
        const {
            status,
            page = 1,
            limit = 10,
            sortBy = "published_at",
            sortOrder = "desc",
            post_type,
            is_featured,
        } = req.query;
        const isAuthenticated = !!req.user;

        if (!status) {
            return res.status(400).json({
                success: false,
                message: "Status is required",
            });
        }

        const validStatuses = ["draft", "published", "archived"];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
            });
        }

        if (!isAuthenticated && status !== "published") {
            return res.status(403).json({
                success: false,
                message: `Unauthorized to access ${status} posts`,
            });
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        const where = { status };
        if (post_type) where.post_type = post_type;
        if (is_featured !== undefined) where.is_featured = is_featured === "true";

        const [posts, total] = await Promise.all([
            prisma.posts.findMany({
                where,
                skip,
                take,
                orderBy: { [sortBy]: sortOrder },
            }),
            prisma.posts.count({ where }),
        ]);

        res.json({
            success: true,
            message: `Posts for status ${status} retrieved successfully`,
            data: posts.map((post) => ({
                id: encodeId(post.id),
                title: post.title,
                slug: post.slug,
                content: post.content,
                excerpt: post.excerpt,
                meta_title: post.meta_title,
                meta_description: post.meta_description,
                status: post.status,
                post_type: post.post_type,
                is_featured: post.is_featured,
                featured_image: post.featured_image ? generateFileUrl(req, post.featured_image) : null,
                view_count: post.view_count,
                author_id: encodeId(post.author_id),
                published_at: post.published_at,
                created_at: post.created_at,
                updated_at: post.updated_at,
            })),
            meta: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit),
                status,
            },
        });
    } catch (error) {
        console.error("Error in getPostByStatus controller:", error);
        res.status(500).json({
            success: false,
            message: "Error retrieving posts by status",
            error: error.message,
        });
    }
};