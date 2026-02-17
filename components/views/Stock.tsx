
import React, { useState, useEffect } from 'react';
import { StatCardCompact } from '../StatCard';
import { StockStatusBadge } from '../StatusBadge';
import { supabase } from '../../lib/supabase';
import { ProductModal } from '../ProductModal';
import { ConfirmModal } from '../ConfirmModal';
import { AddStockModal } from '../AddStockModal';
import { useNotification } from '../../contexts/NotificationContext';
import type { Product, Category } from '../../types';
import { Search, PlusCircle, Edit2, Trash2, Loader2, ChevronLeft, ChevronRight, PackagePlus } from 'lucide-react';
import { getUniqueCategories } from '../../lib/data-utils';

type StockFilterStatus = 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';

export const Stock: React.FC = () => {
    const { showSuccess, showError } = useNotification();
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState('Todos');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<StockFilterStatus>('all');

    // UI States
    const [isIdLoading, setIsIdLoading] = useState<string | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | undefined>(undefined);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    // Delete Confirmation State
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [productToDelete, setProductToDelete] = useState<string | null>(null);

    // Add Stock Modal State
    const [isAddStockModalOpen, setIsAddStockModalOpen] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch categories
            const { data: cats, error: catError } = await supabase
                .from('categories')
                .select('*')
                .order('name');

            if (catError) throw catError;
            setCategories(getUniqueCategories(cats || []));

            // Fetch products with stock
            const { data: prods, error: prodError } = await supabase
                .from('products')
                .select(`
                    *,
                    stock (*)
                `)
                .order('name');

            if (prodError) throw prodError;
            setProducts(prods || []);
        } catch (error) {
            console.error('Erro ao buscar dados:', error);
            showError('Não foi possível carregar os dados do estoque.');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (data: any) => {
        setIsIdLoading('saving');
        try {
            const { id, quantity, min_quantity, unit } = data;

            // Clean payload for products table
            const productPayload = {
                name: data.name,
                category_id: data.category_id,
                price: Number(data.price), // Ensure number
                cost_price: Number(data.cost_price),
                description: data.description,
                // Add other fields if necessary, but ignore 'stock' and others
            };

            if (id) {
                // Update Product
                const { data: updatedProd, error: prodError } = await supabase
                    .from('products')
                    .update(productPayload)
                    .eq('id', id)
                    .select();

                if (prodError) throw prodError;
                if (!updatedProd || updatedProd.length === 0) throw new Error('Produto não atualizado (possível erro de permissão)');

                // Update Stock
                const { error: stockError } = await supabase
                    .from('stock')
                    .update({ quantity, min_quantity, unit })
                    .eq('product_id', id);

                if (stockError) throw stockError;
            } else {
                // Insert Product
                const { data: newProd, error: prodError } = await supabase
                    .from('products')
                    .insert([productPayload])
                    .select(); // REMOVED .single()

                if (prodError) throw prodError;
                if (!newProd || newProd.length === 0) throw new Error('Erro ao criar produto');
                const createdProduct = newProd[0];

                // Insert Stock
                const { error: stockError } = await supabase
                    .from('stock')
                    .insert([{
                        product_id: createdProduct.id,
                        quantity,
                        min_quantity,
                        unit
                    }]);

                if (stockError) throw stockError;
            }

            await fetchData();
            setIsEditModalOpen(false);
            showSuccess('Produto salvo com sucesso!');
        } catch (error: any) {
            console.error('Erro ao salvar:', error);
            showError(error.message || 'Erro ao salvar produto.');
        } finally {
            setIsIdLoading(null);
        }
    };

    const handleDeleteClick = (id: string) => {
        setProductToDelete(id);
        setDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!productToDelete) return;

        setIsIdLoading(productToDelete);
        try {
            const { error } = await supabase
                .from('products')
                .delete()
                .eq('id', productToDelete);

            if (error) throw error;
            setProducts(products.filter(p => p.id !== productToDelete));
            showSuccess('Produto excluído com sucesso!');
        } catch (error) {
            console.error('Erro ao excluir:', error);
            showError('Erro ao excluir o produto.');
        } finally {
            setIsIdLoading(null);
            setProductToDelete(null);
        }
    };


    const handleAddStock = async (productId: string, quantityToAdd: number) => {
        setIsIdLoading('adding_stock');
        try {
            const product = products.find(p => p.id === productId);
            if (!product || !product.stock) throw new Error('Produto não encontrado ou sem estoque inicial.');

            const newQuantity = (product.stock.quantity || 0) + quantityToAdd;

            const { error } = await supabase
                .from('stock')
                .update({ quantity: newQuantity })
                .eq('product_id', productId);

            if (error) throw error;

            // Optimistic update
            setProducts(products.map(p =>
                p.id === productId
                    ? { ...p, stock: { ...p.stock!, quantity: newQuantity } }
                    : p
            ));

            showSuccess(`Adicionado +${quantityToAdd} unidades ao estoque de ${product.name}!`);
            setIsAddStockModalOpen(false);
        } catch (error: any) {
            console.error('Erro ao adicionar estoque:', error);
            showError('Erro ao atualizar estoque.');
        } finally {
            setIsIdLoading(null);
        }
    };

    const filteredProducts = products.filter(product => {
        const categoryName = categories.find(c => c.id === product.category_id)?.name || 'Sem Categoria';
        const matchesCategory = selectedCategory === 'Todos' || categoryName === selectedCategory;
        const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());

        // Status Filter Logic
        let matchesStatus = true;
        const qty = product.stock?.quantity || 0;
        const min = product.stock?.min_quantity || 0;

        if (filterStatus === 'in_stock') {
            matchesStatus = qty >= min;
        } else if (filterStatus === 'low_stock') {
            matchesStatus = qty < min;
        } else if (filterStatus === 'out_of_stock') {
            matchesStatus = qty === 0;
        }

        return matchesCategory && matchesSearch && matchesStatus;
    }).sort((a, b) => {
        if (filterStatus === 'low_stock') {
            const qtyA = a.stock?.quantity || 0;
            const qtyB = b.stock?.quantity || 0;
            // Prioritize items with quantity > 0 over items with quantity === 0
            if (qtyA > 0 && qtyB === 0) return -1;
            if (qtyA === 0 && qtyB > 0) return 1;
        }
        return 0;
    });

    // Reset pagination when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [selectedCategory, searchTerm, filterStatus]);

    // Pagination Logic
    const totalItems = filteredProducts.length;
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedProducts = filteredProducts.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    const lowStockCount = products.filter(p => p.stock && p.stock.quantity < p.stock.min_quantity).length;
    const outOfStockCount = products.filter(p => p.stock && p.stock.quantity === 0).length;

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center bg-background-dark">
                <Loader2 className="animate-spin text-primary" size={48} />
            </div>
        );
    }

    return (
        <main className="flex-1 flex flex-col p-4 md:p-8 gap-8 overflow-y-auto bg-background-dark">
            {/* Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div>
                    <h2 className="text-white text-3xl font-black tracking-tight">Controle de Estoque</h2>
                    <p className="text-gray-400 text-base mt-1">Gerencie produtos e quantidades em tempo real</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => setIsAddStockModalOpen(true)}
                        className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white px-6 py-3 rounded-lg font-bold transition-all"
                    >
                        <PackagePlus size={20} className="text-primary" />
                        Adicionar Estoque
                    </button>
                    <button
                        onClick={() => { setEditingProduct(undefined); setIsEditModalOpen(true); }}
                        className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-lg font-bold shadow-lg shadow-primary/20 transition-all"
                    >
                        <PlusCircle size={20} />
                        Novo Produto
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCardCompact
                    icon="inventory_2"
                    label="Total de Produtos"
                    value={products.length}
                    onClick={() => setFilterStatus('all')}
                    isActive={filterStatus === 'all'}
                />
                <StatCardCompact
                    icon="check_circle"
                    label="Em Estoque"
                    value={products.length - lowStockCount}
                    iconBgColor="bg-green-500/10"
                    iconColor="text-green-500"
                    onClick={() => setFilterStatus('in_stock')}
                    isActive={filterStatus === 'in_stock'}
                />
                <StatCardCompact
                    icon="warning"
                    label="Estoque Baixo"
                    value={lowStockCount}
                    iconBgColor="bg-yellow-500/10"
                    iconColor="text-yellow-500"
                    onClick={() => setFilterStatus('low_stock')}
                    isActive={filterStatus === 'low_stock'}
                />
                <StatCardCompact
                    icon="error"
                    label="Sem Estoque"
                    value={outOfStockCount}
                    iconBgColor="bg-red-500/10"
                    iconColor="text-red-500"
                    onClick={() => setFilterStatus('out_of_stock')}
                    isActive={filterStatus === 'out_of_stock'}
                />
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                <div className="flex-1 max-w-md">
                    <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-2 focus-within:border-primary/50 transition-colors">
                        <Search className="text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar produto pelo nome..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-transparent border-none focus:ring-0 text-white placeholder:text-gray-500 flex-1 outline-none py-1"
                        />
                    </div>
                </div>

                <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
                    {['Todos', ...categories.filter(c => !['Lanches', 'Drinks'].includes(c.name)).map(c => c.name)].map(category => (
                        <button
                            key={category}
                            onClick={() => setSelectedCategory(category)}
                            className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${selectedCategory === category
                                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                                : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                                }`}
                        >
                            {category}
                        </button>
                    ))}
                </div>
            </div>

            {/* Products Table */}
            <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/5 shadow-xl">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-white/5 text-gray-400 text-xs font-bold border-b border-white/10 uppercase tracking-wider">
                            <th className="px-6 py-5">Produto</th>
                            <th className="px-6 py-5">Categoria</th>
                            <th className="px-6 py-5">Preço</th>
                            <th className="px-6 py-5">Quantidade</th>
                            <th className="px-6 py-5">Status</th>
                            <th className="px-6 py-5 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10 text-sm">
                        {paginatedProducts.map(product => {
                            const category = categories.find(c => c.id === product.category_id);
                            const isRowLoading = isIdLoading === product.id;

                            return (
                                <tr key={product.id} className={`group hover:bg-white/[0.03] transition-colors ${isRowLoading ? 'opacity-50 pointer-events-none' : ''}`}>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                                <span className="material-symbols-outlined text-primary text-xl">
                                                    {category?.icon || 'local_bar'}
                                                </span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-white font-bold">{product.name}</span>
                                                <span className="text-gray-500 text-xs">{product.id.slice(0, 8)}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="px-3 py-1 rounded-lg bg-white/5 text-gray-400 text-xs font-medium border border-white/5">
                                            {category?.name || 'Sem Categoria'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-primary font-black font-numbers text-lg">R$ {product.price.toFixed(2)}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="flex flex-col">
                                                <div className="flex items-baseline gap-1">
                                                    <span className="text-white font-black text-xl font-numbers">{product.stock?.quantity}</span>
                                                    <span className="text-gray-500 text-[10px] uppercase font-bold">{product.stock?.unit || 'un'}</span>
                                                </div>
                                                <span className="text-gray-600 text-[10px] font-bold">MÍN: {product.stock?.min_quantity}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <StockStatusBadge
                                            current={product.stock?.quantity || 0}
                                            min={product.stock?.min_quantity || 0}
                                        />
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-end gap-1">

                                            <button
                                                onClick={() => { setEditingProduct(product); setIsEditModalOpen(true); }}
                                                className="p-2 rounded-lg hover:bg-blue-500/10 text-gray-400 hover:text-white transition-colors"
                                            >
                                                <Edit2 size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteClick(product.id)}
                                                className="p-2 rounded-lg hover:bg-red-500/10 text-gray-400 hover:text-red-500 transition-colors"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-400">
                <span>
                    Mostrando {paginatedProducts.length} de {totalItems} produtos
                </span>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="p-2 rounded-lg bg-white/5 disabled:opacity-50 hover:bg-white/10 transition-colors disabled:cursor-not-allowed"
                    >
                        <ChevronLeft size={20} />
                    </button>

                    <div className="flex items-center gap-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                            <button
                                key={page}
                                onClick={() => setCurrentPage(page)}
                                className={`w-8 h-8 rounded-lg font-bold flex items-center justify-center transition-all ${currentPage === page
                                    ? 'bg-primary text-white shadow-lg shadow-primary/20'
                                    : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                                    }`}
                            >
                                {page}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages || totalPages === 0}
                        className="p-2 rounded-lg bg-white/5 disabled:opacity-50 hover:bg-white/10 transition-colors disabled:cursor-not-allowed"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>

            <ProductModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                onSave={handleSave}
                categories={categories}
                initialData={editingProduct}
            />

            <ConfirmModal
                isOpen={deleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                title="Excluir Produto"
                message="Tem certeza que deseja excluir este produto? Esta ação não pode ser desfeita."
                confirmText="Excluir"
                isDestructive
            />

            <AddStockModal
                isOpen={isAddStockModalOpen}
                onClose={() => setIsAddStockModalOpen(false)}
                onSave={handleAddStock}
                categories={categories}
                products={products}
            />
        </main>
    );
};

